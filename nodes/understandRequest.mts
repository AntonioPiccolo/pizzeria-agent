import { ChatOpenAI } from "@langchain/openai";
import { transfertCall } from "../tools/general.mjs";
import { askAgainToUnderstandRequest, requestDetection, answerGeneralInformation } from "../tools/understandRequest.mjs";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { StateAnnotation } from "../agent.mjs";
import { createInterface } from "readline/promises";
import { addConversationMessage, getPromptGeneralInformations, getPromptToolGeneralInformations, getPromptToolTransfertCall, getPromptToolRequestDetection, getPromptConversationHistory } from "../utils/prompt.mjs";

// LLM with trasfer call tool
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const tools = [transfertCall, askAgainToUnderstandRequest, requestDetection, answerGeneralInformation]

const model = llm.bindTools(tools) as ChatOpenAI;

export async function understandRequest(state: typeof StateAnnotation.State) {
  console.info("[UNDERSTAND-REQUEST] Start node")

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const userInput: string = await rl.question("\n> ");
  rl.close();

  let conversation = state.conversation
  const generalInformations = state.generalInformations || {};

  const result = await model.invoke([
    new SystemMessage(`# Sei il proprietario di una pizzeria al Fornareto e devi capire la richiesta del cliente.

      ${getPromptGeneralInformations(generalInformations)}

      ## Le azioni che può fare l'assistente sono SOLAMENTE le seguenti:
      - Prenotare un tavolo
      - Ordinare delle pizze d'asporto
      - Ordinare delle pizze con consegna a domicilio
      - Rispondere a domande generali sul ristorante (orari, indirizzo, telefono, servizi)

      ${getPromptToolGeneralInformations()}
      ${getPromptToolRequestDetection()}
      ${getPromptToolTransfertCall()}
      
      ## Usare il tool ask_again_to_understand_request per i seguenti casi (considera sempre anche lo storico della conversazione):
      - Se domanda/richiesta non è del tutto chiara, esempio: 'Vorrei delle pizze' (si intende pizze d'asporto o consegnare a domicilio?)
      ### IMPORTANTE: considera sempre anche lo storico della conversazione, ad esempio se l'utente ha chiesto se facciamo consegna a domicilio, vuol dire che vuole ordinare delle pizze con consegna a domicilio.
      
      ${getPromptConversationHistory(conversation)}
      `),
    new HumanMessage(userInput)
  ]);

  conversation = addConversationMessage(conversation, userInput, "user");

  if (result.tool_calls && result?.tool_calls.length > 0) {
    const tool = result.tool_calls[0].name;

    console.info(`[UNDERSTAND-REQUEST] Tool selected: ${tool}`)

    if (tool === "ask_again_to_understand_request") {
      const question = result.tool_calls[0].args?.question;
      console.log(`\n${question}`);

      conversation = addConversationMessage(conversation, question, "agent");

      return { next: "understandRequest", conversation };
    }

    if (tool === "request_detection") {
      const intent = result.tool_calls[0].args?.intent;
      console.log(`\n${intent}`);

      switch (intent) {
        case "bookTable":
          return { next: "bookTableInfoFromConversation", call: { intent }, conversation }
        case "takeAway":
          return { next: intent, call: { intent }, conversation }
        case "delivery":
          return { next: intent, call: { intent }, conversation }
      }
    }

    if (tool === "answer_general_information") {
      const answer = result.tool_calls[0].args?.answer;
      console.log(`\n${answer}`);

      conversation = addConversationMessage(conversation, answer, "agent");

      return { next: "understandRequest", conversation: "" };
    }

    if (tool === "transfert_call_to_operator") {
      return { next: "transfertCall" };
    }
  } else {
    console.error("[UNDERSTAND-REQUEST] Error: no tool selected")

    return { next: "transfertCall" };
  }
}