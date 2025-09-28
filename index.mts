import dotenv from 'dotenv';
import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { createInterface } from "readline/promises";
import { z } from 'zod';
import { ClientIntentSchema } from './schemas/GeneralSchemas';
import { ClientIntent } from './models/ClientIntent';
import { BookTable } from './models/BookTable';
import { HomeOrder } from './models/HomeOrder';
import { TakeAwayOrder } from './models/TakeAwayOrder';
import { Disambiguation } from './models/Disambiguation';

dotenv.config();

const transfertCallToOperator = tool(() => {
  console.log('\nStiamo trasferendo la chiamata ad un operatore, rimanga in linea...');
  return 'Chiamata trasferita all\'operatore.';
}, {
  name: 'transfert_call_to_operator',
  description: 'Trasferisce la chiamata ad un operatore umano quando il cliente lo richiede.',
  schema: z.object({
    reason: z.string().describe("Motivo del trasferimento all'operatore."),
  })
})

// LLM per interpretare l'input utente
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const tools = [transfertCallToOperator]
const toolNode = new ToolNode(tools)

// LLM con tools per tutti i modelli
const llmWithTools = llm.bindTools(tools)

// Istanze dei modelli
const clientIntent = new ClientIntent(llm, llmWithTools as ChatOpenAI);
const bookTable = new BookTable(llmWithTools as ChatOpenAI);
const homeOrder = new HomeOrder(llmWithTools as ChatOpenAI);
const takeAwayOrder = new TakeAwayOrder(llmWithTools as ChatOpenAI);
const disambiguation = new Disambiguation(llm);

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
  }),
  ambiguousContext: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null
  }),
  conversationHistory: Annotation<Array<{role: string, content: string}> | null>({
    reducer: (_prev, next) => next,
    default: () => null
  }),
  messages: Annotation<Array<any>>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => []
  }),
  operatorCalled: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => false
  })
});

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});


// Funzione per classificare l'intento usando l'LLM strutturato
async function classifyIntent(userInput: string, conversationHistory?: Array<{role: string, content: string}>): Promise<z.infer<typeof ClientIntentSchema> | { toolCall: true, response: any } | { disambiguation: true, ambiguousContext: string }> {
  return await clientIntent.classifyIntentCalled(userInput, conversationHistory);
}

// Nodo iniziale
async function start(state: typeof StateAnnotation.State) {
  // Se abbiamo una conversationHistory (proveniente dalla disambiguazione), usiamola
  let userInput: string;
  let conversationHistory: Array<{role: string, content: string}> | undefined;
  
  if (state.conversationHistory) {
    // Prendiamo l'ultimo messaggio dell'utente dalla conversazione
    const lastUserMessage = state.conversationHistory
      .filter(msg => msg.role === "user")
      .pop();
    userInput = lastUserMessage?.content || "";
    // Passiamo l'intera conversazione, incluse le risposte dell'AI
    conversationHistory = state.conversationHistory;
  } else {
    console.log("\nSalve, sono l'assistente vocale della pizzeria Al Fornareto, come posso aiutarla?");
    userInput = await rl.question("\n> ");
  }
  
  // Usa l'LLM per capire l'intento, passando anche la conversazione se presente
  const result = await classifyIntent(userInput, conversationHistory);
  
  // Check if it's a tool call
  if ('toolCall' in result && result.toolCall) {
    return { step: "toolNode", messages: [result.response] };
  }
  
  // Check if it's a disambiguation case
  if ('disambiguation' in result && result.disambiguation) {
    return { 
      step: "disambiguation", 
      ambiguousContext: result.ambiguousContext,
      conversationHistory: null
    };
  }
  
  // Now TypeScript knows result is the ClientIntentSchema type
  const { intent } = result as z.infer<typeof ClientIntentSchema>;
  
  switch (intent) {
    case "homeOrder":
      console.log("\n📦 Ha scelto ordine a domicilio.");
      return { step: "homeOrder", orderType: "homeOrder", conversationHistory: null };
    case "takeAwayOrder":
      console.log("\n🏃 Ha scelto ordine d'asporto.");
      return { step: "takeAwayOrder", orderType: "takeAwayOrder", conversationHistory: null };
    case "bookTable":
      console.log("\n🪑 Ha scelto di prenotare un tavolo.");
      return { step: "bookTable", orderType: "bookTable", conversationHistory: null };
    case "other":
      // This case is handled in classifyIntentCalled when confidence >= 0.8
      return { step: "end" };
  }
}

// Nodo domicilio
async function homeOrderNode(state: typeof StateAnnotation.State) {
  return await homeOrder.getAddress(state, rl);
}

// Nodo asporto
async function takeAwayOrderNode(state: typeof StateAnnotation.State) {
  return await takeAwayOrder.getNumberOfPizzas(state, rl);
}

// Nodo prenotazione
async function bookTableNode(state: typeof StateAnnotation.State) {
  return await bookTable.getNumberOfPeople(state, rl);
}

// Nodo disambiguazione
async function disambiguationNode(state: typeof StateAnnotation.State) {
  const originalInput = state.ambiguousContext || "";
  return await disambiguation.handleDisambiguation(state, rl, originalInput);
}

// Tool node wrapper
async function toolNodeWrapper(state: typeof StateAnnotation.State) {
  // Execute the tool
  await toolNode.invoke(state);
  
  // After tool execution, end the conversation
  console.log("\nGrazie per aver utilizzato il nostro servizio.");
  return { step: "end" };
}


// Routing
function route(state: typeof StateAnnotation.State): string {
  switch (state.step) {
    case "start":
      return "start";
    case "disambiguation":
      return "disambiguation";
    case "homeOrder":
      return "homeOrder";
    case "takeAwayOrder":
      return "takeAwayOrder";
    case "bookTable":
      return "bookTable";
    case "toolNode":
      return "toolNode";
    case "end":
      return "__end__";
    default:
      return "__end__";
  }
}

// Costruzione grafo
const workflow = new StateGraph(StateAnnotation)
  .addNode("start", start)
  .addNode("disambiguation", disambiguationNode)
  .addNode("homeOrder", homeOrderNode)
  .addNode("takeAwayOrder", takeAwayOrderNode)
  .addNode("bookTable", bookTableNode)
  .addNode("toolNode", toolNodeWrapper)
  .addConditionalEdges("__start__", route)
  .addConditionalEdges("start", route)
  .addConditionalEdges("disambiguation", route)
  .addConditionalEdges("homeOrder", route)
  .addConditionalEdges("takeAwayOrder", route)
  .addConditionalEdges("bookTable", route)
  .addConditionalEdges("toolNode", route);

const app = workflow.compile();

// Funzione principale
export async function runPizzeriaAgent() {  
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