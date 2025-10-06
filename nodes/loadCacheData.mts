import fs from 'fs/promises';
import path from 'path';

export async function loadCacheData(state: any) {
  try {
    const jsonPath = path.join(process.cwd(), 'informations.json');
    const data = await fs.readFile(jsonPath, 'utf8');
    const generalInformations = JSON.parse(data);
    
    console.log("Informazioni del ristorante caricate con successo");
    
    return {
      ...state,
      generalInformations,
      next: "understandRequest"
    };
  } catch (error) {
    console.error("Errore nel caricamento delle informazioni:", error);
    
    return {
      ...state,
      generalInformations: {},
      next: "understandRequest"
    };
  }
}