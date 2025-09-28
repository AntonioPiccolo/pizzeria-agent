import { z } from 'zod';

// Schema per l'estrazione di numeri
export const NumberOfPizzasSchema = z.object({
  number: z.number()
    .describe("Il numero di pizze da ordinare"),
  found: z.boolean()
    .describe("Se è stato trovato un numero valido"),
  originalText: z.string()
    .describe("Il testo originale che rappresenta il numero di pizze da ordinare")
});