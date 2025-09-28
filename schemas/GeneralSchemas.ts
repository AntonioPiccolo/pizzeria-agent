import { z } from 'zod';

// Schema per la classificazione dell'intento
export const ClientIntentSchema = z.object({
  intent: z.enum(["domicilio", "asporto", "prenotazione", "unclear"])
    .describe("L'intento classificato del cliente"),
  confidence: z.number().min(0).max(1)
    .describe("Livello di confidenza della classificazione da 0 a 1"),
  reasoning: z.string()
    .describe("Breve spiegazione del perché è stato scelto questo intento")
});