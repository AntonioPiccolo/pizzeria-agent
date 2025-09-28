import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { z } from "zod";
import { ClientIntentSchema } from "../schemas/GeneralSchemas";

export class ClientIntent {
  private llmWithTools: ChatOpenAI;

  constructor(private llm: ChatOpenAI, llmWithTools?: ChatOpenAI) {
    this.llmWithTools = llmWithTools || this.llm;
  }

  async classifyIntentCalled(
    userInput: string, 
    conversationHistory?: Array<{role: string, content: string}>
  ): Promise<z.infer<typeof ClientIntentSchema> | { toolCall: true, response: any } | { disambiguation: true, ambiguousContext: string }> {
    const messages = [
      new SystemMessage(`# Assistente Pizzeria - Classificazione Intent

Sei l'assistente vocale della pizzeria Al Fornareto.

IMPORTANTE: Trasferisci a un operatore SOLO se il cliente:
- Chiede ESPLICITAMENTE di parlare con un operatore
- Usa frasi come "passami qualcuno", "voglio parlare con una persona", "fammi parlare con qualcuno"

NON trasferire all'operatore se il cliente dice semplicemente "pizzeria" o altre parole simili nel contesto di una risposta.

## ATTENZIONE SPECIALE per risposte a domande di disambiguazione:
Se nella conversazione precedente c'è una domanda tipo "Preferisce ordinare per la consegna a domicilio o venire a ritirare in pizzeria?":
- Risposte come "pizzeria", "ritiro", "vengo io", "asporto" → classificare come **"takeAwayOrder"** con confidence ALTA (>0.9)
- Risposte come "casa", "domicilio", "consegna", "portate voi" → classificare come **"homeOrder"** con confidence ALTA (>0.9)

IMPORTANTE: Quando rispondi a una domanda di disambiguazione esplicita, assegna sempre confidence alta se la risposta è chiara.

## Se il cliente non vuole un operatore, classifica il suo intento:
Analizza cosa vuole fare il cliente e rispondi in formato JSON con:
- intent: una delle opzioni sotto
- confidence: un numero tra 0 e 1
- reasoning: breve spiegazione

## Opzioni disponibili:
1. **"homeOrder"** - se vuole ordinare con consegna a casa
2. **"takeAwayOrder"** - se vuole ordinare e venire a ritirare
3. **"bookTable"** - se vuole prenotare un tavolo
4. **"other"** - se non è chiaro cosa vuole

IMPORTANTE: Se il cliente dice genericamente "Vorrei ordinare" senza specificare domicilio o asporto:
- Classifica come "takeAwayOrder" con confidence BASSA (circa 0.3-0.5) per attivare la disambiguazione
- NON classificare con confidence alta che porterebbe al trasferimento all'operatore`)
    ];

    // Se c'è una conversazione precedente, aggiungiamola per dare contesto
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(new SystemMessage(
        "Conversazione precedente per contesto:\n" + 
        conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')
      ));
    }

    messages.push(new HumanMessage(userInput));
    console.log(messages);
    try {
      // Use LLM with tools for a single call
      const response = await this.llmWithTools.invoke(messages);
      
      // Check if tools were called
      if (response.tool_calls && response.tool_calls.length > 0) {
        const operatorCall = response.tool_calls.find((call: any) => 
          call.name === 'transfert_call_to_operator'
        );
        if (operatorCall) {
          return { toolCall: true, response } as any;
        }
      }
      
      // Parse the JSON response to extract intent classification
      const content = response.content.toString();
      const jsonMatch = content.match(/\{[^}]+\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const result = {
          intent: parsed.intent || "other",
          confidence: parsed.confidence || 0,
          reasoning: parsed.reasoning || "Classificazione automatica"
        };

        // Handle disambiguation cases
        if (result.intent === "other") {
          console.log("\nNon riesco ad aiutarla in questo, la metto subito in contatto con il nostro personale, rimanga in linea.");
          return result;
        }
        console.log(result);
        // Se abbiamo una conversation history (stiamo processando una disambiguazione),
        // siamo più permissivi con la confidence
        const confidenceThreshold = conversationHistory && conversationHistory.length >= 0 ? 0.7 : 0.9;
        
        if (result.confidence <= confidenceThreshold) {
          return { disambiguation: true, ambiguousContext: userInput } as any;
        }

        return result;
      }
      
      // Fallback if JSON parsing fails - trigger disambiguation
      return { disambiguation: true, ambiguousContext: userInput } as any;
    } catch (error) {
      console.error("Errore nella classificazione:", error);
      return { 
        intent: "other", 
        confidence: 0,
        reasoning: "Errore durante la classificazione"
      };
    }
  }
}