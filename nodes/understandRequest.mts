import { ChatOpenAI } from "@langchain/openai";
import { transfertCall } from "../tools/general.mjs";
import { askAgainToUnderstandRequest, requestDetection, answerGeneralInformation } from "../tools/understandRequest.mjs";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { StateAnnotation } from "../agent.mjs";
import { createInterface } from "readline/promises";
import { addConversationMessage } from "../utils/prompt.mjs";

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

      ## Informazioni del ristorante:
      - Nome: ${generalInformations.name || 'Pizzeria Al Fornareto'}
      - Telefono: ${generalInformations.phoneNumber || '+39 0444511502'}
      - Indirizzo: ${generalInformations.address || 'Viale Trieste, 110'}, ${generalInformations.city || 'Vicenza'}
      - Orari di apertura:
        ${generalInformations.openingHours ? Object.entries(generalInformations.openingHours).map(([day, hours]) => `- ${day}: ${hours}`).join('\n        ') : 'Non specificati'}
      - Servizi disponibili:
        - Consegna a domicilio: ${generalInformations.services?.delivery ? 'Sì' : 'No'}
        - Take away: ${generalInformations.services?.takeaway ? 'Sì' : 'No'}
        - Prenotazione tavoli: ${generalInformations.services?.tableReservation ? 'Sì' : 'No'}

      ## Le azioni che può fare l'assistente sono SOLAMENTE le seguenti:
      - Prenotare un tavolo
      - Ordinare delle pizze d'asporto
      - Ordinare delle pizze con consegna a domicilio
      - Rispondere a domande generali sul ristorante (orari, indirizzo, telefono, servizi)
      
      ## IMPORTANTISSIMO - Usare il tool transfert_call_to_operator per questi casi: 
      - se viene chiesto di parlare con qualcuno (operatore, personale o un nome di una persona)
      - se la richiesta è di una persona nervosa, arrabbiata o frustrata
      - se viene chiesta un'informazione che non è disponibile nelle informazioni del ristorante
      - se la domanda riguarda il menu, prezzi, ingredienti o altre informazioni non presenti

      ## Usare il tool request_detection per i seguenti casi:
      - Se la richiesta è per prenotare un tavolo
      - Se la richiesta è per ordinare delle pizze d'asporto
      - Se la richiesta è per consegnare delle pizze a domicilio
      
      ## Usare il tool ask_again_to_understand_request per i seguenti casi:
      - Se domanda/richiesta non è del tutto chiara, esempio: 'Vorrei delle pizze' (si intende pizze d'asporto o consegnare a domicilio?)
      
      ## Usare il tool answer_general_information per i seguenti casi:
      - Se la domanda riguarda gli orari di apertura
      - Se la domanda riguarda l'indirizzo o la posizione del ristorante
      - Se la domanda riguarda il numero di telefono
      - Se la domanda riguarda i servizi disponibili (delivery, take away, prenotazione)
      - IMPORTANTE: usa SOLO le informazioni disponibili sopra, non inventare nulla
      
      ## Storico Conversazione:
      ${conversation}
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

    if (tool === "transfert_call_to_operator") {
      return { next: "transfertCall" };
    }

    if (tool === "answer_general_information") {
      const answer = result.tool_calls[0].args?.answer;
      console.log(`\n${answer}`);

      conversation = addConversationMessage(conversation, answer, "agent");

      return { next: "understandRequest", conversation };
    }
  } else {
    console.error("[UNDERSTAND-REQUEST] Error: no tool selected")

    return { next: "end" };
  }
}