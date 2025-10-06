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

  const modelWithStructuredOutput = llm.withStructuredOutput(bookTableSchema);
  const result = await modelWithStructuredOutput.invoke([
    new SystemMessage(`# Sei il proprietario di un locale e devi raccogliere le informazioni dallo Storico Conversazione utili per una prenotazione di un tavolo.

      ## Informazioni temporali correnti:
      - Data/ora attuale: ${state.currentDateTime} (${state.currentDayOfWeek})
      - Fuso orario: Italia (Europe/Rome)

      ## Storico Conversazione:
      ${conversation}`),
    new HumanMessage(`## Raccogli le seguenti informazioni, se presenti, per una prenotazione di un tavolo:
      - Il numero di persone che vogliono prenotare un tavolo
      - La data della prenotazione
      - L'ora della prenotazione
      - Il nome del cliente che sta prenotando il tavolo
      
      Se non sono presenti le informazioni in modo chiaro non restituirle.`)
  ]);

  if (result) {
    return { next: "bookTable", call: { bookTable: result }, conversation: "" };
  }

  return { next: "bookTable", conversation: "" };
}