import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { Interface } from "readline/promises";

export class BookTable {
  constructor(private llm: ChatOpenAI) {}

  async getNumberOfPeople(_state: any, rl: Interface): Promise<any> {
    console.log("\nPer quante persone desidera prenotare?");
    const userInput = await rl.question("\n> ");
    
    const messages = [
      new SystemMessage(`# Assistente Pizzeria - Estrazione Numero Persone

Sei un assistente di una pizzeria che sta prendendo una prenotazione.

IMPORTANTE: Se il cliente mostra uno di questi segnali:
- Chiede esplicitamente di parlare con un operatore
- Sembra frustrato o nervoso
- Dice che non lo stai capendo
- Usa frasi come "passami qualcuno" o "voglio parlare con una persona"

DEVI IMMEDIATAMENTE usare il tool 'transfert_call_to_operator'.

## Istruzioni:
Se il cliente non vuole un operatore, estrai il numero di persone dal messaggio e rispondi SOLO con il numero (es: "4").

## Esempi:
- "siamo in quattro" → risposta: "4"
- "per due" → risposta: "2"
- "una decina di persone" → risposta: "10"`),
      new HumanMessage(userInput)
    ];
    
    try {
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
      
      // Extract number from the response
      const numberMatch = response.content.toString().match(/\d+/);
      const number = numberMatch ? parseInt(numberMatch[0]) : null;
      
      if (!number || number < 1) {
        console.log("\nPer favore inserisca un numero valido di persone.");
        return { step: "bookTable" };
      }
      
      console.log(`\n✅ Perfetto! Ho registrato la sua prenotazione per ${number} person${number === 1 ? 'a' : 'e'}.`);
      console.log("Grazie per aver utilizzato il nostro servizio. Arrivederci!");
      return { step: "end", numberOfPeople: number };
    } catch (error) {
      console.log("\nNon ho capito il numero. Può ripetere per quante persone?");
      return { step: "bookTable" };
    }
  }
}