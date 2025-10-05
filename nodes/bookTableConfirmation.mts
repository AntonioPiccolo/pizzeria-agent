import { StateAnnotation } from "../agent.mjs";
import { DateTime } from "luxon";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { createInterface } from "readline/promises";
import { confirmationSchema } from "../utils/schemas.mjs";
import { addConversationMessage } from "../utils/prompt.mjs";

// LLM with trasfer call tool
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

export async function bookTableConfirmation(state: typeof StateAnnotation.State) {
  console.info("[BOOK-TABLE-CONFIRMATION] Start node")

  const { people, date, time, name } = state.call.bookTable;
  let conversation = state.conversation
  
  // Converte la data dal formato DD/MM/YYYY a una forma più naturale
  const formattedDate = DateTime.fromFormat(date, "dd/MM/yyyy", { locale: "it" }).toFormat("EEEE d MMMM", { locale: "it" })
  
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

  const modelWithStructuredOutput = llm.withStructuredOutput(confirmationSchema);
  const result = await modelWithStructuredOutput.invoke([
    new SystemMessage(`# Sei il proprietario di un locale e devi capire se i dati raccolti per una prenotazione di un tavolo sono corretti.

      ## Dati raccolti:
      - Il numero di persone che vogliono prenotare un tavolo: ${people}
      - La data della prenotazione: ${formattedDate}
      - L'ora della prenotazione: ${time}
      - Il nome del cliente che sta prenotando il tavolo: ${name}
      `),
    new HumanMessage(`${userInput}`)
  ]);

  console.log(result);

  if (result.confirmation) {
    console.log("Perfetto, la prenotazione è stata confermata a presto.");

    return { next: "__end__" };
  } else {
    if (!result.hasDataToModify) {
      const question = "Quali dati della prenotazione vuoi modificare?";
      console.log(question);

      conversation = addConversationMessage(conversation, question, "agent");
    
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout
      });
      const userInput: string = await rl.question("\n> ");
      rl.close();
    
      conversation = addConversationMessage(conversation, userInput, "user");
    }

    return { next: "bookTableInfoFromConversation", conversation };
  }
}