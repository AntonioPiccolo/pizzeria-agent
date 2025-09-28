import dotenv from 'dotenv';
import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createInterface } from "readline/promises";
import { z } from 'zod';
import { ClientIntentSchema } from './schemas/GeneralSchemas';
import { BookTable } from './models/BookTable';
import { HomeOrder } from './models/HomeOrder';
import { TakeoutOrder } from './models/TakeoutOrder';

dotenv.config();

// LLM per interpretare l'input utente
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

// LLM strutturato per la classificazione
const classifierLlm = llm.withStructuredOutput(ClientIntentSchema, {
  name: "intent_classification"
});

// Istanze dei modelli
const bookTable = new BookTable(llm);
const homeOrder = new HomeOrder(llm);
const takeoutOrder = new TakeoutOrder(llm);

// Definizione dello stato con Annotation
const StateAnnotation = Annotation.Root({
  step: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "start"
  }),
  orderType: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null
  }),
  address: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null
  }),
  numberOfPizzas: Annotation<number | null>({
    reducer: (_prev, next) => next,
    default: () => null
  }),
  numberOfPeople: Annotation<number | null>({
    reducer: (_prev, next) => next,
    default: () => null
  })
});

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Funzione per classificare l'intento usando l'LLM strutturato
async function classifyIntent(userInput: string): Promise<z.infer<typeof ClientIntentSchema>> {
  const messages = [
    new SystemMessage(`# Assistente Pizzeria - Classificazione Intent

Sei un assistente di una pizzeria. Analizza cosa vuole fare il cliente basandoti sul suo messaggio.

## Opzioni disponibili:
1. **"domicilio"** - se vuole ordinare con consegna a casa
2. **"asporto"** - se vuole ordinare e venire a ritirare
3. **"prenotazione"** - se vuole prenotare un tavolo
4. **"unclear"** - se non è chiaro cosa vuole`),
    new HumanMessage(userInput)
  ];

  try {
    const result = await classifierLlm.invoke(messages);
    return result;
  } catch (error) {
    console.error("Errore nella classificazione:", error);
    return { 
      intent: "unclear", 
      confidence: 0,
      reasoning: "Errore durante la classificazione"
    };
  }
}

// Nodo iniziale
async function start(_state: typeof StateAnnotation.State) {
  console.log("\nSalve, sono l'assistente vocale, come posso aiutarla?");
  console.log("(Può ordinare a domicilio, d'asporto o prenotare un tavolo)");
  
  const userInput = await rl.question("\n> ");
  
  // Usa l'LLM per capire l'intento
  const { intent, confidence } = await classifyIntent(userInput);
  
  if (confidence < 0.7 || intent === "unclear") {
    console.log("\nMi dispiace, non ho capito bene. Può ripetere?");
    console.log("Le opzioni sono:");
    console.log("- Ordinare a domicilio");
    console.log("- Ordinare d'asporto"); 
    console.log("- Prenotare un tavolo");
    return { step: "start" };
  }
  
  switch (intent) {
    case "domicilio":
      console.log("\n📦 Ha scelto ordine a domicilio.");
      return { step: "domicilio", orderType: "domicilio" };
    case "asporto":
      console.log("\n🏃 Ha scelto ordine d'asporto.");
      return { step: "asporto", orderType: "asporto" };
    case "prenotazione":
      console.log("\n🪑 Ha scelto di prenotare un tavolo.");
      return { step: "prenotazione", orderType: "prenotazione" };
    default:
      return { step: "start" };
  }
}

// Nodo domicilio
async function domicilio(state: typeof StateAnnotation.State) {
  return await homeOrder.getAddress(state, rl);
}

// Nodo asporto
async function asporto(state: typeof StateAnnotation.State) {
  return await takeoutOrder.getNumberOfPizzas(state, rl);
}

// Nodo prenotazione
async function prenotazione(state: typeof StateAnnotation.State) {
  return await bookTable.getNumberOfPeople(state, rl);
}

// Routing
function route(state: typeof StateAnnotation.State): string {
  switch (state.step) {
    case "start":
      return "start";
    case "domicilio":
      return "domicilio";
    case "domicilio-pizze":
      return "domicilio";
    case "asporto":
      return "asporto";
    case "prenotazione":
      return "prenotazione";
    case "end":
      return "__end__";
    default:
      return "__end__";
  }
}

// Costruzione grafo
const workflow = new StateGraph(StateAnnotation)
  .addNode("start", start)
  .addNode("domicilio", domicilio)
  .addNode("asporto", asporto)
  .addNode("prenotazione", prenotazione)
  .addConditionalEdges("__start__", route)
  .addConditionalEdges("start", route)
  .addConditionalEdges("domicilio", route)
  .addConditionalEdges("asporto", route)
  .addConditionalEdges("prenotazione", route);

const app = workflow.compile();

// Funzione principale
export async function runPizzeriaAgent() {
  console.log("🍕 Benvenuto alla Pizzeria AI! 🍕");
  console.log("(Ora capisco il linguaggio naturale!)");
  
  try {
    await app.invoke({ step: "start" });
  } finally {
    rl.close();
  }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runPizzeriaAgent().catch(console.error);
}