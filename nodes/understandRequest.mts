import { ChatOpenAI } from "@langchain/openai";
import { transfertCall } from "../tools/general.mjs";
import { askAgainToUnderstandRequest, requestDetection } from "../tools/understandRequest.mjs";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { StateAnnotation } from "../agent.mjs";
import { createInterface } from "readline/promises";
import { addConversationMessage } from "../utils/prompt.mjs";

// LLM with trasfer call tool
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const understandRequestTools = [transfertCall, askAgainToUnderstandRequest, requestDetection]

// LLM with tools for all models
const understandRequestModel = llm.bindTools(understandRequestTools) as ChatOpenAI;

// Understand request node
export async function understandRequest(state: typeof StateAnnotation.State) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const userInput: string = await rl.question("\n> ");

  rl.close();

  const result = await understandRequestModel.invoke([
    new SystemMessage(`# Sei il proprietario di una pizzeria al Fornareto e devi capire la richiesta del cliente.

      ## Le azioni che può fare l'assistente sono SOLAMENTE le seguenti:
      - Prenotare un tavolo
      - Ordinare delle pizze d'asporto
      - Ordinare delle pizze con consegna a domicilio
      
      ## IMPORTANTISSIMO - Usare il tool transfert_call_to_operator per questi casi: 
      - se viene chiesto di parlare con qualcuno (operatore, personale o un nome di una persona)
      - se la richiesta è di una persona nervosa, arrabbiata o frustrata

      ## Usare il tool request_detection per i seguenti casi:
      - Se la richiesta è per prenotare un tavolo
      - Se la richiesta è per ordinare delle pizze d'asporto
      - Se la richiesta è per consegnare delle pizze a domicilio
      
      ## Usare il tool ask_again_to_understand_request per i seguenti casi:
      - Se domanda/richiesta non è del tutto chiara, esempio: 'Vorrei delle pizze' (si intende pizze d'asporto o consegnare a domicilio?)
      
      ## Storico Conversazione:
      ${state.conversation}
      `),
    new HumanMessage(userInput)
  ]);

  let conversation = addConversationMessage(state.conversation, userInput, "user");

  if (result.tool_calls && result.tool_calls.length > 0) {
    const toolName = result.tool_calls[0].name;

    switch (toolName) {
      case "ask_again_to_understand_request":
        const question = result.tool_calls[0].args?.question;
        console.log(`\n${question}`);

        conversation = addConversationMessage(conversation, question, "agent");

        return { next: "understandRequest", conversation: conversation };
      case "request_detection":
        const intent = result.tool_calls[0].args?.intent;
        console.log(`\n${intent}`);

        return { next: "end", intent: intent, conversation: "" };
      case "transfert_call_to_operator":
        return { next: "transfertCall" };
      default:
        return { next: "end" };
    }
  }

  return { next: "end" };
}