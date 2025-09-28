import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { createInterface } from "readline/promises";
import { AmbiguityAnalysisSchema } from "../schemas/GeneralSchemas";

export class Disambiguation {
  private analyzerLlm: any;

  constructor(private llm: ChatOpenAI) {
    this.analyzerLlm = this.llm.withStructuredOutput(AmbiguityAnalysisSchema, {
      name: "ambiguity_analysis"
    });
  }

  // Analizza il tipo di ambiguità e suggerisce una domanda
  async analyzeAmbiguity(userInput: string): Promise<z.infer<typeof AmbiguityAnalysisSchema>> {
    const messages = [
      new SystemMessage(`# Analisi Ambiguità - Pizzeria

Analizza l'input del cliente per capire il tipo di ambiguità presente.

## Tipi di ambiguità:
- **orderType**: Il cliente vuole ordinare ma non è chiaro se a domicilio o d'asporto
- **general**: Richiesta troppo generica per capire cosa vuole fare

## Suggerisci una domanda appropriata per chiarire basandoti sul contesto.

Esempi:
- Input: "Vorrei ordinare delle pizze" → Tipo: orderType, Domanda: "Preferisce ordinare per la consegna a domicilio o venire a ritirare in pizzeria?"
- Input: "Buongiorno" → Tipo: general, Domanda: "Buongiorno! Come posso aiutarla? Vuole ordinare, prenotare un tavolo o altro?"
`),
      new HumanMessage(userInput)
    ];

    try {
      const result = await this.analyzerLlm.invoke(messages);
      return result;
    } catch (error) {
      console.error("Errore nell'analisi dell'ambiguità:", error);
      return {
        ambiguityType: "general",
        suggestedQuestion: "Come posso aiutarla? Vuole ordinare per consegna a domicilio, asporto, o prenotare un tavolo?",
        possibleIntents: ["homeOrder", "takeAwayOrder", "bookTable"]
      };
    }
  }

  // Gestisce la disambiguazione interattiva
  async handleDisambiguation(
    _state: any,
    rl: ReturnType<typeof createInterface>,
    originalInput: string
  ): Promise<any> {
    const analysis = await this.analyzeAmbiguity(originalInput);
    
    console.log(`\n❓ ${analysis.suggestedQuestion}`);
    
    const userResponse = await rl.question("\n> ");
    
    // Costruiamo la conversazione completa
    const conversationHistory = [
      { role: "user", content: originalInput },
      { role: "assistant", content: analysis.suggestedQuestion },
      { role: "user", content: userResponse }
    ];
    
    return {
      step: "start",
      ambiguousContext: null,
      conversationHistory // Passiamo l'intera conversazione per la ri-classificazione
    };
  }
}