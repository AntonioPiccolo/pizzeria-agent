import { tool } from '@langchain/core/tools';
import { bookTableSchema, confirmationSchema } from '../utils/schemas.mjs';

export const retrieveBookingInfo = tool((informations: typeof bookTableSchema | null) => {
  console.log(informations);
  return informations;
}, {
  name: 'retrieve_booking_info',
  description: 'DEVI SEMPRE usare questo tool quando l\'utente fornisce informazioni sulla prenotazione (numero persone, data, ora, nome). Estrai e salva TUTTE le informazioni fornite dall\'utente, mettendo null per quelle non fornite.',
  schema: bookTableSchema
})

export const confirmationBookingInfo = tool((confirmation: typeof confirmationSchema | null) => {
  console.log(confirmation);
  return confirmation;
}, {
  name: 'confirmation_booking_info',
  description: 'Questo tool viene usato quando il cliente conferma la prenotazione ed i dati raccolti sono corretti o quando dice che i dati sono sbagliati o non corretta o quando vuole modificare i dati della prenotazione (esempio: "La prenotazione è per 3 persone, non per 4" o "Cambia la prenotazione a nome Marco" o "La prenotazione non è per questo lunedì che viene ma per quello dopo")',
  schema: confirmationSchema
})