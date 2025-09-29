import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const transfertCall = tool(({ reason }: { reason: string }) => {
  console.log('\nStiamo trasferendo la chiamata ad un operatore, rimanga in linea...');

  return reason;
}, {
  name: 'transfert_call_to_operator',
  description: 'Trasferisce la chiamata ad un operatore umano quando il cliente lo richiede.',
  schema: z.object({
    reason: z.string().describe("Motivo del trasferimento all'operatore.").optional(),
  })
})