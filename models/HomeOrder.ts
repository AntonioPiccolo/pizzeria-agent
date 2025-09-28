import type { Interface } from "readline/promises";
import { Order } from "./Order";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export class HomeOrder extends Order {
  async getAddress(_state: any, rl: Interface): Promise<any> {
    console.log("\nQual è l'indirizzo di consegna?");
    const userInput = await rl.question("\n> ");
    
    // Prima verifica se il cliente vuole parlare con un operatore
    const toolCheckMessages = [
      new SystemMessage(`Sei un assistente di una pizzeria che sta prendendo un ordine a domicilio.
      
IMPORTANTE: Se il cliente mostra uno di questi segnali:
- Chiede esplicitamente di parlare con un operatore
- Sembra frustrato o nervoso
- Dice che non lo stai capendo
- Usa frasi come "passami qualcuno" o "voglio parlare con una persona"

DEVI IMMEDIATAMENTE usare il tool 'transfert_call_to_operator'.

Altrimenti, procedi normalmente con la raccolta dell'indirizzo.`),
      new HumanMessage(userInput)
    ];
    
    // Check with tools-enabled LLM
    const toolCheckResponse = await this.llm.invoke(toolCheckMessages);
    
    // If tool was called, handle it
    if (toolCheckResponse.tool_calls && toolCheckResponse.tool_calls.length > 0) {
      const operatorCall = toolCheckResponse.tool_calls.find((call: any) => 
        call.name === 'transfert_call_to_operator'
      );
      if (operatorCall) {
        return { step: "toolNode", messages: [toolCheckResponse] };
      }
    }
    
    return { step: "domicilio-pizze", address: userInput };
  }
}