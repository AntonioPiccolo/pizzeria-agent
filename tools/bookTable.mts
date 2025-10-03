import { tool } from '@langchain/core/tools';
import { bookTableSchema } from '../utils/schemas.mjs';

export const retrieveBookingInfo = tool((informations: typeof bookTableSchema | null) => {
  console.log(informations);
  return informations;
}, {
  name: 'retrieve_booking_info',
  description: 'DEVI SEMPRE usare questo tool quando l\'utente fornisce informazioni sulla prenotazione (numero persone, data, ora, nome). Estrai e salva TUTTE le informazioni fornite dall\'utente, mettendo null per quelle non fornite.',
  schema: bookTableSchema
})