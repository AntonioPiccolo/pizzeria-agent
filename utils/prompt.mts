export function addConversationMessage(conversation: string, message: string, role: string) {
  return `${conversation}\n${role.toUpperCase()}: ${message}`;
}

export function getPromptGeneralInformations(generalInformations: any) {
  let prompt = `## Informazioni del locale:
      - Nome: ${generalInformations.name || 'Pizzeria Al Fornareto'}
      - Telefono: ${generalInformations.phoneNumber || '+39 0444511502'}
      - Indirizzo: ${generalInformations.address || 'Viale Trieste, 110'}, ${generalInformations.city || 'Vicenza'}
      - Orari di apertura:
        ${generalInformations.openingHours ? Object.entries(generalInformations.openingHours).map(([day, hours]) => `- ${day}: ${hours}`).join('\n        ') : 'Non specificati'}
      - Servizi disponibili:
        - Consegna a domicilio: ${generalInformations.services?.delivery ? 'Sì' : 'No'}
        - Take away: ${generalInformations.services?.takeaway ? 'Sì' : 'No'}
        - Prenotazione tavoli: ${generalInformations.services?.tableReservation ? 'Sì' : 'No'}`;

  if (generalInformations.menu) {
    prompt += `\n      
      ## Menu e offerta gastronomica:`;
    
    if (generalInformations.menu.pizza?.available) {
      prompt += `\n      - Pizza: Sì`;
      if (generalInformations.menu.pizza.doughTypes?.length > 0) {
        prompt += `\n        - Tipi di impasto disponibili:`;
        generalInformations.menu.pizza.doughTypes.forEach((dough: any) => {
          prompt += `\n          • ${dough.name}: ${dough.description}`;
        });
      }
      if (generalInformations.menu.pizza.categories?.length > 0) {
        prompt += `\n        - Categorie di pizze: ${generalInformations.menu.pizza.categories.join(', ')}`;
      }
    } else if (generalInformations.menu.pizza?.available === false) {
      prompt += `\n      - IMPORTANTE: Non facciamo pizze (servizio non disponibile)`;
    }
    
    if (generalInformations.menu.restaurant?.available) {
      prompt += `\n      - Cucina ristorante: Sì`;
      if (generalInformations.menu.restaurant.dishCategories?.length > 0) {
        prompt += `\n        - Categorie piatti:`;
        generalInformations.menu.restaurant.dishCategories.forEach((category: any) => {
          prompt += `\n          • ${category.name}`;
          if (category.examples?.length > 0) {
            prompt += `: ${category.examples.join(', ')}`;
          }
          if (category.subcategories?.length > 0) {
            category.subcategories.forEach((sub: any) => {
              prompt += `\n            - ${sub.name}: ${sub.examples?.join(', ') || ''}`;
            });
          }
        });
      }
    } else if (generalInformations.menu.restaurant?.available === false) {
      prompt += `\n      - IMPORTANTE: Non offriamo servizio di cucina/ristorante`;
    }
    
    if (generalInformations.menu.specialDiets) {
      prompt += `\n      - Opzioni dietetiche speciali:`;
      if (generalInformations.menu.specialDiets.vegetarian) prompt += `\n        - Vegetariano: Sì`;
      if (generalInformations.menu.specialDiets.vegan) prompt += `\n        - Vegano: Sì`;
      if (generalInformations.menu.specialDiets.glutenFree) prompt += `\n        - Senza glutine: Sì`;
    }
  }

  return prompt;
}

export function getPromptToolGeneralInformations() {
  return `## Usare il tool answer_general_information per i seguenti casi se la domanda riguarda::
      - Gli orari di apertura
      - L'indirizzo o la posizione del ristorante
      - Il numero di telefono
      - Se il locale fa pizze o cucina ristorante (piatti da cucina)
      - La possibilità di portare animali
      - La tipologia di pizze disponibili o di piatti disponibili
      - I servizi disponibili (delivery, take away, prenotazione al tavolo)
      - IMPORTANTE: usa SOLO le informazioni disponibili sopra, non inventare nulla`;
}

export function getPromptToolTransfertCall() {
  return `## IMPORTANTISSIMO - Usare il tool transfert_call_to_operator per questi casi: 
      - se viene chiesto di parlare con qualcuno (operatore, personale o un nome di una persona)
      - se la richiesta è di una persona nervosa, arrabbiata o frustrata
      - se viene chiesta un'informazione che non è disponibile nelle informazioni del ristorante
      - se la domanda riguarda il menu, prezzi, ingredienti o altre informazioni non presenti`;
}

export function getPromptToolRequestDetection() {
  return `## Usare il tool request_detection per i seguenti casi:
      - Se la richiesta è per prenotare un tavolo
      - Se la richiesta è per ordinare delle pizze d'asporto
      - Se la richiesta è per consegnare delle pizze a domicilio`;
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
