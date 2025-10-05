import { z } from 'zod';

// Schema for booking table information
export const bookTableSchema = z.object({
  people: z.number().nullable().describe(`Il numero di persone che vogliono prenotare un tavolo.`),
  date: z.string().nullable().describe(`La data della prenotazione nel formato DD/MM/YYYY (es. 25/12/2024). Usa il fuso orario italiano.`),
  time: z.string().nullable().describe(`L'ora della prenotazione nel formato HH:MM (es. 20:30). Usa il fuso orario italiano.`),
  name: z.string().nullable().describe(`Il nome del cliente che sta prenotando il tavolo.`)
});

// Schema for booking table information
export const confirmationSchema = z.object({
  confirmation: z.boolean().describe(`La conferma che sia tutto corretto, se i dati sono corretti risponde true, altrimenti risponde false.`),
  hasDataToModify: z.boolean().describe(`Se il cliente fornisce alcune informazioni per modificare la prenotazione risponde true, altrimenti, se non fornisce alcuna informazione utile risponde false. 
    Esempio da ritornare true: 
    "La prenotazione è per 3 persone, non per 4" o "Cambia la prenotazione a nome Marco" o "La prenotazione non è per questo lunedì che viene ma per quello dopo"

    Esempio da ritornare false: 
    "No, la prenotazione non è corretta" o "No"`)
});