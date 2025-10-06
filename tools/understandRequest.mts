import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const askAgainToUnderstandRequest = tool(({ question }: { question: string }) => {
  console.log(`\nChiediamo di nuovo al cliente di spiegare la sua richiesta: ${question}`);

  return question;
}, {
  name: 'ask_again_to_understand_request',
  description: 'Chiede di nuovo al cliente di spiegare la sua richiesta.',
  schema: z.object({
    question: z.string().describe(`Domanda da chiedere al cliente per capire esettamente la richiesta. 
      Esempio: 'Vorrei delle pizze' (si intende pizze d'asporto o consegnare a domicilio?)`).optional(),
  })
})

export const requestDetection = tool(({ intent }: { intent: string }) => {
  console.log(`\nRchiesta del cliente: ${intent}`);

  return intent;
}, {
  name: 'request_detection',
  description: `Capisci con chiarezza se la richiesta è per prenotare un tavolo, ordinare delle pizze d'asporto o con consegnare delle pizze a domicilio.`,
  schema: z.object({
    intent: z.enum(['bookTable', 'takeAway', 'delivery'])
    .describe(`La richiesta del cliente, prenotare un tavolo, ordinare delle pizze d'asporto o con consegna delle pizze a domicilio.`),
  })
})

export const answerGeneralInformation = tool(({ answer }: { answer: string }) => {
  console.log(`\n${answer}`);
  return answer;
}, {
  name: 'answer_general_information',
  description: 'Risponde a domande generali sul ristorante usando le informazioni disponibili.',
  schema: z.object({
    answer: z.string().describe('La risposta da fornire al cliente basata sulle informazioni disponibili del ristorante.')
  })
})