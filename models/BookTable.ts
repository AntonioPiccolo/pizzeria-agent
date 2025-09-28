import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NumberOfPeopleSchema } from "../schemas/BookTableSchemas";
import type { Interface } from "readline/promises";
import type { z } from "zod";

export class BookTable {
  private numberOfPeopleExtractorLlm: any;

  constructor(private llm: ChatOpenAI) {
    this.numberOfPeopleExtractorLlm = this.llm.withStructuredOutput(NumberOfPeopleSchema, {
      name: "number_of_people_extraction"
    });
  }

  async getNumberOfPeople(_state: any, rl: Interface): Promise<any> {
    console.log("\nPer quante persone desidera prenotare?");
    const userInput = await rl.question("\n> ");
    
    // Usa l'LLM strutturato per estrarre il numero
    const messages = [
      new SystemMessage(`# Assistente Pizzeria - Estrazione Numero Persone

Sei un assistente di una pizzeria. Il tuo compito è estrarre il numero di persone da prenotare.

## Istruzioni:
Estrai il numero di persone dal seguente messaggio del cliente.

## Esempi:
- "siamo in quattro" = 4
- "per due" = 2
- "una decina di persone" = 10`),
      new HumanMessage(userInput)
    ];
    
    try {
      const result = await this.numberOfPeopleExtractorLlm.invoke(messages) as z.infer<typeof NumberOfPeopleSchema>;
      
      if (!result.found || result.number < 1) {
        console.log("\nPer favore inserisca un numero valido di persone.");
        return { step: "prenotazione" };
      }
      
      console.log(`\n✅ Perfetto! Ho registrato la sua prenotazione per ${result.number} person${result.number === 1 ? 'a' : 'e'}.`);
      console.log("Grazie per aver utilizzato il nostro servizio. Arrivederci!");
      return { step: "end", numberOfPeople: result.number };
    } catch (error) {
      console.log("\nNon ho capito il numero. Può ripetere per quante persone?");
      return { step: "prenotazione" };
    }
  }
}