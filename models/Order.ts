import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { Interface } from "readline/promises";

export abstract class Order {
  constructor(protected llm: ChatOpenAI) {}

  async getNumberOfPizzas(_state: any, rl: Interface, orderType: 'domicilio' | 'asporto' = 'asporto'): Promise<any> {
    console.log("\nQuante pizze vorrebbe ordinare?");
    const userInput = await rl.question("\n> ");
    
    // Usa l'LLM con tools e istruzioni per estrarre il numero
    const messages = [
      new SystemMessage(`# Assistente Pizzeria - Estrazione Numero Pizze

Sei un assistente di una pizzeria. Il tuo compito è estrarre numeri di pizze da ordinare.

IMPORTANTE: Se il cliente mostra uno di questi segnali:
- Chiede esplicitamente di parlare con un operatore
- Sembra frustrato o nervoso
- Dice che non lo stai capendo
- Usa frasi come "passami qualcuno" o "voglio parlare con una persona"

DEVI IMMEDIATAMENTE usare il tool 'transfert_call_to_operator'.

## Istruzioni:
Se il cliente non vuole un operatore, estrai il numero di pizze dal messaggio e rispondi SOLO con il numero (es: "2").

## Esempi:
- "due pizze" → risposta: "2"
- "una margherita e una capricciosa" → risposta: "2"
- "3" → risposta: "3"`),
      new HumanMessage(userInput)
    ];
    
    // Use the regular LLM with tools
    const response = await this.llm.invoke(messages);
    
    // Check if tools were called
    if (response.tool_calls && response.tool_calls.length > 0) {
      const operatorCall = response.tool_calls.find((call: any) => 
        call.name === 'transfert_call_to_operator'
      );
      if (operatorCall) {
        return { step: "toolNode", messages: [response] };
      }
    }
    
    // If no tool was called, extract number from the response
    try {
      const numberMatch = response.content.toString().match(/\d+/);
      const number = numberMatch ? parseInt(numberMatch[0]) : null;
      
      if (!number || number < 1) {
        console.log("\nPer favore inserisca un numero valido di pizze.");
        return { step: orderType };
      }
      
      const orderTypeText = orderType === 'domicilio' ? "a domicilio" : "d'asporto";
      console.log(`\n✅ Perfetto! Ho registrato il suo ordine ${orderTypeText} per ${number} pizz${number === 1 ? 'a' : 'e'}.`);
      console.log("Grazie per aver utilizzato il nostro servizio. Arrivederci!");
      return { step: "end", numberOfPizzas: number };
    } catch (error) {
      console.log("\nNon ho capito il numero. Può ripetere quante pizze desidera?");
      return { step: orderType };
    }
  }
}