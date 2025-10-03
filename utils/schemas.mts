import { z } from 'zod';

// Schema for booking table information
export const bookTableSchema = z.object({
  people: z.number().nullable().describe(`Il numero di persone che vogliono prenotare un tavolo.`),
  date: z.string().nullable().describe(`La data della prenotazione.`),
  time: z.string().nullable().describe(`L'ora della prenotazione.`),
  name: z.string().nullable().describe(`Il nome del cliente che sta prenotando il tavolo.`)
});