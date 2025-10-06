import { StateAnnotation } from "../agent.mjs";
import { DateTime } from "luxon";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { createInterface } from "readline/promises";
import { addConversationMessage, getPromptGeneralInformations, getPromptToolGeneralInformations, getPromptToolTransfertCall, getPromptToolRequestDetection, getPromptTemporalInformations, getPromptConversationHistory } from "../utils/prompt.mjs";
import { confirmationBookingInfo, retrieveBookingInfo } from "../tools/bookTable.mjs";
import { requestDetection, answerGeneralInformation } from "../tools/understandRequest.mjs";
import { transfertCall } from "../tools/general.mjs";

// LLM with trasfer call tool
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const modelConfirmation = llm.bindTools([confirmationBookingInfo, requestDetection, transfertCall, answerGeneralInformation]) as ChatOpenAI;
const modelRetrieveBookingInfo = llm.bindTools([retrieveBookingInfo, requestDetection, transfertCall, answerGeneralInformation]) as ChatOpenAI;

async function handleBookModifications(
  state: typeof StateAnnotation.State, 
  conversation: string, 
  confirmation: any
) {
  const { people, date, time, name } = state.call.bookTable;
  const formattedDate = date ? DateTime.fromFormat(date, "dd/MM/yyyy", { locale: "it" }).toFormat("EEEE d MMMM", { locale: "it" }) : ""
  
  let updatedConversation = conversation;
  let userInput = "";
  
  if (!confirmation.hasDataToModify) {
    const question = "Quali dati della prenotazione vuoi modificare?";
    console.log(question);

    updatedConversation = addConversationMessage(updatedConversation, question, "agent");
  
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    userInput = await rl.question("\n> ");
    rl.close();
  
    updatedConversation = addConversationMessage(updatedConversation, userInput, "user");
  }

  const result = await modelRetrieveBookingInfo.invoke([
    new SystemMessage(`# Sei il proprietario di un locale e devi modificare le informazioni di una prenotazione di un tavolo.

      ${getPromptGeneralInformations(state.generalInformations)}
      ${getPromptTemporalInformations(state)}

      ${getPromptToolGeneralInformations()}
      ${getPromptToolRequestDetection()}
      ${getPromptToolTransfertCall()}

      ## Usare il tool retrieve_booking_info quando:
      - Il cliente fornisce QUALSIASI informazione relativa alla prenotazione (numero persone, data, ora, nome)
      - L'utente vuole modificare i dati della prenotazione (cambia la data, l'ora, il numero di persone o nome)
      ### IMPORTANTE - Il tool deve SEMPRE ritornare tutti i dati aggiornati, quindi se il clinete aggiorna il numero di persone il tool deve ritornare l'oggetto con il numero di persone aggiornato ed i restanti dati già raccolti senza modifiche, non deve MAI ritornare i dati in modo parziale.

      ## Dati raccolti della prenotazione da eventualmente modificare:
      - Il numero di persone che vogliono prenotare un tavolo: ${people}
      - La data della prenotazione: ${formattedDate}
      - L'ora della prenotazione: ${time}
      - Il nome del cliente che sta prenotando il tavolo: ${name}

      ${getPromptConversationHistory(updatedConversation)}`),
    new HumanMessage(`${userInput}`)
  ]);

  if (result.tool_calls && result?.tool_calls.length > 0) {
    const tool = result.tool_calls[0].name;
    console.info(`[BOOK-TABLE-CONFIRMATION] Tool selected: ${tool}`)
    
    if (tool === "retrieve_booking_info") {
      const informations = result.tool_calls[0].args;
      console.info("[BOOK-TABLE-CONFIRMATION] Retrieved informations:", informations);

      return { next: "bookTableConfirmation", call: { bookTable: informations }, conversation: updatedConversation };
    }

    if (tool === "answer_general_information") {
      const answer = result.tool_calls[0].args?.answer;
      console.log(`\n${answer}`);

      updatedConversation = addConversationMessage(updatedConversation, answer, "agent");

      return { next: "bookTableConfirmation", conversation: updatedConversation };
    }

    if (tool === "request_detection") {
      const intent = result.tool_calls[0].args?.intent;

      switch (intent) {
        case "takeAway":
          return { next: intent, call: { intent }, conversation: updatedConversation }
        case "delivery":
          return { next: intent, call: { intent }, conversation: updatedConversation }
      }
    }

    if (tool === "transfert_call_to_operator") {
      return { next: "transfertCall" };
    }
  } else {
    console.error("[BOOK-TABLE-CONFIRMATION] Error: no tool selected")

    return { next: "end" };
  }
}

export async function bookTableConfirmation(state: typeof StateAnnotation.State) {
  console.info("[BOOK-TABLE-CONFIRMATION] Start node")

  const { people, date, time, name } = state.call.bookTable;
  let conversation = state.conversation
  
  // Converte la data dal formato DD/MM/YYYY a una forma più naturale
  const formattedDate = date ? DateTime.fromFormat(date, "dd/MM/yyyy", { locale: "it" }).toFormat("EEEE d MMMM", { locale: "it" }) : ""
  
  const confirmationMessage = `Ho registrato ${people} persone ${formattedDate} alle ore ${time} a nome ${name}. E' corretto?`

  console.log(confirmationMessage);

  conversation = addConversationMessage(conversation, confirmationMessage, "agent");

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const userInput: string = await rl.question("\n> ");
  rl.close();

  conversation = addConversationMessage(conversation, userInput, "user");

  const result = await modelConfirmation.invoke([
    new SystemMessage(`# Sei il proprietario di un locale e devi capire se i dati raccolti per una prenotazione di un tavolo sono corretti.

      ${getPromptGeneralInformations(state.generalInformations)}
      ${getPromptTemporalInformations(state)}

      ${getPromptToolGeneralInformations()}
      ${getPromptToolRequestDetection()}
      ${getPromptToolTransfertCall()}

      ## Usare il tool confirmation_booking_info quando:
      - L'utente conferma la prenotazione ed approva i dati raccolti
      - L'utente non approva i dati raccolti o dice che la prenotazione non è corretta
      - L'utente vuole modificare i dati della prenotazione o indica delle informazioni diverse dai dati raccolti

      ## Dati raccolti:
      - Il numero di persone che vogliono prenotare un tavolo: ${people}
      - La data della prenotazione: ${formattedDate}
      - L'ora della prenotazione: ${time}
      - Il nome del cliente che sta prenotando il tavolo: ${name}
      `),
    new HumanMessage(`${userInput}`)
  ]);

  if (result.tool_calls && result?.tool_calls.length > 0) {
    const tool = result.tool_calls[0].name;
    console.info(`[BOOK-TABLE-CONFIRMATION] Tool selected: ${tool}`)

    if (tool === "confirmation_booking_info") {
      const confirmation = result.tool_calls[0].args;
      console.info("[BOOK-TABLE-CONFIRMATION] Confirmation:", confirmation);

      if (confirmation.confirmation) {
        console.log("Perfetto, la prenotazione è stata confermata a presto.");
        return { next: "__end__" };
      } else {
        return await handleBookModifications(
          state, 
          conversation, 
          confirmation
        );
      }
    }

    if (tool === "answer_general_information") {
      const answer = result.tool_calls[0].args?.answer;
      console.log(`\n${answer}`);

      conversation = addConversationMessage(conversation, answer, "agent");

      return { next: "bookTableConfirmation", conversation };
    }

    if (tool === "request_detection") {
      const intent = result.tool_calls[0].args?.intent;

      switch (intent) {
        case "takeAway":
          return { next: intent, call: { intent }, conversation }
        case "delivery":
          return { next: intent, call: { intent }, conversation }
      }
    }

    if (tool === "transfert_call_to_operator") {
      return { next: "transfertCall" };
    }
  } else {
    console.error("[BOOK-TABLE-CONFIRMATION] Error: no tool selected")

    return { next: "end" };
  }
}