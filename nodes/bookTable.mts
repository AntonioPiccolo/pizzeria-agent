import { StateAnnotation } from "../agent.mjs";
import { ChatOpenAI } from "@langchain/openai";
import { transfertCall } from "../tools/general.mjs";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { retrieveBookingInfo } from "../tools/bookTable.mjs";
import { createInterface } from "readline/promises";
import { addConversationMessage, getPromptGeneralInformations, getPromptToolGeneralInformations, getPromptToolTransfertCall, getPromptToolRequestDetection, getPromptTemporalInformations, getPromptConversationHistory } from "../utils/prompt.mjs";
import { requestDetection, answerGeneralInformation } from "../tools/understandRequest.mjs";

// LLM with trasfer call tool
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const tools = [retrieveBookingInfo, requestDetection, transfertCall, answerGeneralInformation]

const model = llm.bindTools(tools) as ChatOpenAI;

function generateBookingQuestion(bookTable: {people?: number | null, date?: string | null, time?: string | null, name?: string | null}): string {
  const missing: string[] = [];
  
  if (!bookTable.people) {
    missing.push("in quante persone siete");
  }
  if (!bookTable.date) {
    missing.push("per quale data");
  }
  if (!bookTable.time) {
    missing.push("a che orario volete prenotare");
  }
  if (!bookTable.name) {
    missing.push("il suo nome");
  }
  
  if (missing.length === 0) {
    return "";
  }
  
  if (missing.length === 1) {
    return `Sapresti dirmi ${missing[0]}?`;
  }
  
  const lastItem = missing.pop();
  return `Sapresti dirmi ${missing.join(", ")} e ${lastItem}?`;
}

export async function bookTable(state: typeof StateAnnotation.State) {
  console.info("[BOOK-TABLE] Start node")

  const question = generateBookingQuestion(state.call.bookTable);

  if (!question) {
    return { next: "bookTableConfirmation", conversation: "" };
  }

  console.info(question)

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const userInput: string = await rl.question("\n> ");
  rl.close();

  let conversation = state.conversation

  const result = await model.invoke([
    new SystemMessage(`# Sei il proprietario di un locale e devi raccogliere le informazioni mancanti per una prenotazione di un tavolo.

      ${getPromptGeneralInformations(state.generalInformations)}
      ${getPromptTemporalInformations(state)}

      ${getPromptToolGeneralInformations()}
      ${getPromptToolRequestDetection()}
      ${getPromptToolTransfertCall()}

      ## IMPORTANTISSIMO - Usare SEMPRE il tool retrieve_booking_info quando:
      - L'utente fornisce QUALSIASI informazione relativa alla prenotazione (numero persone, data, ora, nome)
      - Devi SEMPRE estrarre e salvare queste informazioni usando il tool, anche se l'utente ne fornisce solo una
      
      ### Esempi di quando usare retrieve_booking_info:
      - "Siamo in 3 persone" → usa il tool con {people: 3, date: null, time: null, name: null}
      - "Per domani alle 20:30" → usa il tool con {people: null, date: "domani", time: "20:30", name: null}
      - "Il mio nome è Mario" → usa il tool con {people: null, date: null, time: null, name: "Mario"}
      - "Siamo in 5 persone che vogliono prenotare" → usa il tool con {people: 5, date: null, time: null, name: null}

      ## Informazioni da raccogliere attraverso il tool retrieve_booking_info:
      - Il numero di persone che vogliono prenotare un tavolo
      - La data della prenotazione
      - L'ora della prenotazione
      - Il nome del cliente che sta prenotando il tavolo

      ${getPromptConversationHistory(conversation)}
      `),
    new HumanMessage(`${question}\n${userInput}`)
  ]);

  conversation = addConversationMessage(conversation, question, "agent");
  conversation = addConversationMessage(conversation, userInput, "user");

  if (result.tool_calls && result?.tool_calls.length > 0) {
    const tool = result.tool_calls[0].name;
    console.info(`[BOOK-TABLE] Tool selected: ${tool}`)

    if (tool === "retrieve_booking_info") {
      const informations = result.tool_calls[0].args;
      console.info("[BOOK-TABLE] Retrieved informations:", informations);

      // Filtra solo le chiavi valide dello schema
      const validKeys = ['people', 'date', 'time', 'name'];
      for (const key in informations) {
        if (validKeys.includes(key) && informations[key] !== null && informations[key] !== undefined) {
          state.call.bookTable[key] = informations[key];
        }
      }

      return { next: "bookTable", call: { bookTable: state.call.bookTable }, conversation };
    }

    if (tool === "answer_general_information") {
      const answer = result.tool_calls[0].args?.answer;
      console.log(`\n${answer}`);

      conversation = addConversationMessage(conversation, answer, "agent");

      return { next: "bookTable", conversation };
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
    console.error("[BOOK-TABLE] Error: no tool selected")

    return { next: "end" };
  }
}