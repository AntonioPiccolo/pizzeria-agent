import { z } from 'zod';

// Schema per la classificazione dell'intento
export const ClientIntentSchema = z.object({
  intent: z.enum(["homeOrder", "takeAwayOrder", "bookTable", "other"])
    .describe("L'intento classificato del cliente"),
  confidence: z.number().min(0).max(1)
    .describe("Livello di confidenza della classificazione da 0 a 1"),
  reasoning: z.string()
    .describe("Breve spiegazione del perché è stato scelto questo intento")
});

// Schema per l'analisi dell'ambiguità
export const AmbiguityAnalysisSchema = z.object({
  ambiguityType: z.enum(["orderType", "general"])
    .describe("Il tipo di ambiguità rilevata"),
  suggestedQuestion: z.string()
    .describe("La domanda da fare per chiarire l'ambiguità"),
  possibleIntents: z.array(z.string())
    .describe("Gli intenti possibili basati sul contesto")
});