import { StateAnnotation } from "../agent.mjs";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { bookTableSchema } from "../utils/schemas.mjs";

// LLM with trasfer call tool
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

export async function bookTableInfoFromConversation(state: typeof StateAnnotation.State) {
  console.info("[BOOK-TABLE-INFO-FROM-CONVERSATION] Start node")

  let conversation = state.conversation

  const bookModification = state.call?.bookTable?.name ? true : false; // Modifica prenotazione

  let systemMessage
  let humanMessage

  if (bookModification) { // Modifica prenotazione
    systemMessage = `# Sei il proprietario di un locale e devi modificare le informazioni di una prenotazione di un tavolo.

      ## Dati raccolti della prenotazione da eventualmente modificare:
      - Il numero di persone che vogliono prenotare un tavolo: ${state.call.bookTable.people}
      - La data della prenotazione: ${state.call.bookTable.date}
      - L'ora della prenotazione: ${state.call.bookTable.time}
      - Il nome del cliente che sta prenotando il tavolo: ${state.call.bookTable.name}

      ## IMPORTANTISSIMO - Modifica i dati raccolti se richiesto esplicitamente dall'utente, altrimenti ritorna i dati raccolti senza modifiche.
      
      ## Storico Conversazione:
      ${conversation}`

      humanMessage = `Modifica eventualmente i dati raccolti in riferimento allo storico della conversazione. Se non risultano moddifiche chiare restituisci i dati raccolti senza modifiche.`
  } else { // Nuova prenotazione
   systemMessage = `# Sei il proprietario di un locale e devi raccogliere le informazioni dallo Storico Conversazione utili per una prenotazione di un tavolo.

      ## Informazioni temporali correnti:
      - Data/ora attuale: ${state.currentDateTime} (${state.currentDayOfWeek})
      - Fuso orario: Italia (Europe/Rome)

      ## Storico Conversazione:
      ${conversation}`

    humanMessage = `## Raccogli le seguenti informazioni, se presenti, per una prenotazione di un tavolo:
      - Il numero di persone che vogliono prenotare un tavolo
      - La data della prenotazione
      - L'ora della prenotazione
      - Il nome del cliente che sta prenotando il tavolo
      
      Se non sono presenti le informazioni in modo chiaro non restituirle.`
  }

  const modelWithStructuredOutput = llm.withStructuredOutput(bookTableSchema);
  const result = await modelWithStructuredOutput.invoke([
    new SystemMessage(systemMessage),
    new HumanMessage(humanMessage)
  ]);

  if (result) {
    return { next: "bookTable", call: { bookTable: result }, conversation: "" };
  }

  return { next: "bookTable", conversation: "" };
}