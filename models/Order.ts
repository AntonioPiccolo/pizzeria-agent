import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NumberOfPizzasSchema } from "../schemas/TakeoutOrderSchemas";
import type { Interface } from "readline/promises";
import type { z } from "zod";

export abstract class Order {
  protected numberOfPizzasExtractorLlm: any;

  constructor(protected llm: ChatOpenAI) {
    this.numberOfPizzasExtractorLlm = this.llm.withStructuredOutput(NumberOfPizzasSchema, {
      name: "number_of_pizzas_extraction"
    });
  }

  async getNumberOfPizzas(_state: any, rl: Interface, orderType: 'domicilio' | 'asporto' = 'asporto'): Promise<any> {
    console.log("\nQuante pizze vorrebbe ordinare?");
    const userInput = await rl.question("\n> ");
    
    // Usa l'LLM strutturato per estrarre il numero
    const messages = [
      new SystemMessage(`# Assistente Pizzeria - Estrazione Numero Pizze

Sei un assistente di una pizzeria. Il tuo compito è estrarre numeri di pizze da ordinare.

## Istruzioni:
Estrai il numero di pizze dal seguente messaggio del cliente.

## Esempi:
- "due pizze" = 2
- "una margherita e una capricciosa" = 2
- "3" = 3`),
      new HumanMessage(userInput)
    ];
    
    try {
      const result = await this.numberOfPizzasExtractorLlm.invoke(messages) as z.infer<typeof NumberOfPizzasSchema>;
      
      if (!result.found || result.number < 1) {
        console.log("\nPer favore inserisca un numero valido di pizze.");
        return { step: orderType };
      }
      
      const orderTypeText = orderType === 'domicilio' ? "a domicilio" : "d'asporto";
      console.log(`\n✅ Perfetto! Ho registrato il suo ordine ${orderTypeText} per ${result.number} pizz${result.number === 1 ? 'a' : 'e'}.`);
      console.log("Grazie per aver utilizzato il nostro servizio. Arrivederci!");
      return { step: "end", numberOfPizzas: result.number };
    } catch (error) {
      console.log("\nNon ho capito il numero. Può ripetere quante pizze desidera?");
      return { step: orderType };
    }
  }
}