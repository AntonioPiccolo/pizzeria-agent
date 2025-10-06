export function addConversationMessage(conversation: string, message: string, role: string) {
  return `${conversation}\n${role.toUpperCase()}: ${message}`;
}

export function getPromptGeneralInformations(generalInformations: any) {
  return `## Informazioni del locale:
      - Nome: ${generalInformations.name || 'Pizzeria Al Fornareto'}
      - Telefono: ${generalInformations.phoneNumber || '+39 0444511502'}
      - Indirizzo: ${generalInformations.address || 'Viale Trieste, 110'}, ${generalInformations.city || 'Vicenza'}
      - Orari di apertura:
        ${generalInformations.openingHours ? Object.entries(generalInformations.openingHours).map(([day, hours]) => `- ${day}: ${hours}`).join('\n        ') : 'Non specificati'}
      - Servizi disponibili:
        - Consegna a domicilio: ${generalInformations.services?.delivery ? 'Sì' : 'No'}
        - Take away: ${generalInformations.services?.takeaway ? 'Sì' : 'No'}
        - Prenotazione tavoli: ${generalInformations.services?.tableReservation ? 'Sì' : 'No'}`;
}

export function getPromptToolGeneralInformations() {
  return `## Usare il tool answer_general_information per i seguenti casi:
      - Se la domanda riguarda gli orari di apertura
      - Se la domanda riguarda l'indirizzo o la posizione del ristorante
      - Se la domanda riguarda il numero di telefono
      - Se la domanda riguarda i servizi disponibili (delivery, take away, prenotazione)
      - IMPORTANTE: usa SOLO le informazioni disponibili sopra, non inventare nulla`;
}

export function getPromptToolTransfertCall(extended: boolean = false) {
  const base = `## IMPORTANTISSIMO - Usare il tool transfert_call_to_operator per questi casi: 
      - se viene chiesto di parlare con qualcuno (operatore, personale o un nome di una persona)
      - se la richiesta è di una persona nervosa, arrabbiata o frustrata`;
  
  if (extended) {
    return base + `
      - se viene chiesta un'informazione che non è disponibile nelle informazioni del ristorante
      - se la domanda riguarda il menu, prezzi, ingredienti o altre informazioni non presenti`;
  }
  
  return base;
}

export function getPromptToolRequestDetection(context: 'understandRequest' | 'booking' = 'booking') {
  if (context === 'understandRequest') {
    return `## Usare il tool request_detection per i seguenti casi:
      - Se la richiesta è per prenotare un tavolo
      - Se la richiesta è per ordinare delle pizze d'asporto
      - Se la richiesta è per consegnare delle pizze a domicilio`;
  }
  
  return `## IMPORTANTISSIMO - Usare SEMPRE il tool request_detection quando il cliente esplicita una delle seguenti richieste:
      - Ordinare delle pizze d'asporto
      - Ordinare delle pizze con consegna a domicilio`;
}

export function getPromptTemporalInformations(state: any) {
  return `## Informazioni temporali correnti:
      - Data/ora attuale: ${state.currentDateTime} (${state.currentDayOfWeek})
      - Fuso orario: Italia (Europe/Rome)`;
}

export function getPromptConversationHistory(conversation: string) {
  return `## Storico Conversazione:
      ${conversation}`;
}
