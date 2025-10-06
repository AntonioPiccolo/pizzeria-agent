import dotenv from 'dotenv';
import { StateGraph, Annotation } from "@langchain/langgraph";
import { understandRequest } from './nodes/understandRequest.mjs';
import { bookTableInfoFromConversation } from './nodes/bookTableInfoFromConversation.mjs'
import { bookTable } from './nodes/bookTable.mjs'
import { takeAway } from './nodes/takeAway.mjs'
import { delivery } from './nodes/delivery.mjs'
import { transfertCall } from './nodes/transfertCall.mjs';
import { addConversationMessage } from './utils/prompt.mjs';
import { bookTableConfirmation } from './nodes/bookTableConfirmation.mjs';
import { loadCacheData } from './nodes/loadCacheData.mts';
import { DateTime } from "luxon";

dotenv.config();

// Definizione dello stato con Annotation
export const StateAnnotation = Annotation.Root({
  next: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "start"
  }),
  conversation: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => ""
  }),
  currentDateTime: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => {
      const currentDateTime = DateTime.now().setZone("Europe/Rome");
      return currentDateTime.toLocaleString(DateTime.DATETIME_MED, { locale: "it" });
    }
  }),
  currentDayOfWeek: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => {
      const currentDateTime = DateTime.now().setZone("Europe/Rome");
      return currentDateTime.setLocale("it").toFormat("EEEE");
    }
  }),
  generalInformations: Annotation<any>({
    reducer: (_prev, next) => next,
    default: () => ({})
  }),
  call: Annotation<{
    bookTable: {
      people: number | null;
      date: string | null;
      time: string | null;
      name: string | null;
    };
    takeAway: {};
    delivery: {};
  }>({
    reducer: (_prev, next) => next,
    default: () => {
      return {
        bookTable: {
        people: null,
        date: null,
        time: null,
        name: null
      },
      takeAway: {},
      delivery: {}
      }
    }
  })
});

// Nodo iniziale
async function start(state: typeof StateAnnotation.State) {
  const question = "Salve, sono l'assistente vocale della pizzeria Al Fornareto, come posso aiutarla?";
  console.log(question);

  const conversation = addConversationMessage(state.conversation, question, "agent");
  
  // Aggiorna data/ora corrente
  const currentDateTime = DateTime.now().setZone("Europe/Rome");
  const formattedDateTime = currentDateTime.toLocaleString(DateTime.DATETIME_MED, { locale: "it" });
  const dayOfWeek = currentDateTime.setLocale("it").toFormat("EEEE");

  return { 
    next: "loadCacheData", 
    conversation,
    currentDateTime: formattedDateTime,
    currentDayOfWeek: dayOfWeek
  };
}

// Routing
function understandRequestRoute(state: typeof StateAnnotation.State): string {
  switch (state.next) {
    case "start":
      return "start";
    case "understandRequest":
      return "understandRequest";
    case "bookTableInfoFromConversation":
      return "bookTableInfoFromConversation"
    case "takeAway":
      return "takeAway"
    case "delivery":
      return "delivery"
    case "transfertCall":
      return "transfertCall";
    case "end":
      return "__end__";
    default:
      return "__end__";
  }
}

function bookTableRoute(state: typeof StateAnnotation.State): string {
  switch (state.next) {
    case "bookTable":
      return "bookTable";
    case "bookTableConfirmation":
      return "bookTableConfirmation";
    case "takeAway":
      return "takeAway";
    case "delivery":
      return "delivery";
    case "transfertCall":
      return "transfertCall";
    default:
      return "__end__";
  }
}

function bookTableConfirmationRoute(state: typeof StateAnnotation.State): string {
  switch (state.next) {
    case "bookTableConfirmation":
      return "bookTableConfirmation";
    case "takeAway":
      return "takeAway";
    case "delivery":
      return "delivery";
    case "transfertCall":
      return "transfertCall";
    default:
      return "__end__";
  }
}

// Graph construction
const workflow = new StateGraph(StateAnnotation)
  // Nodes
  .addNode("start", start)
  .addNode("loadCacheData", loadCacheData)
  .addNode("understandRequest", understandRequest)
  .addNode("bookTableInfoFromConversation", bookTableInfoFromConversation)
  .addNode("bookTable", bookTable)
  .addNode("bookTableConfirmation", bookTableConfirmation)
  .addNode("takeAway", takeAway)
  .addNode("delivery", delivery)
  .addNode("transfertCall", transfertCall)
  // Edges
  .addEdge("__start__", "start")
  .addEdge("start", "loadCacheData")
  .addEdge("loadCacheData", "understandRequest")
  .addEdge("bookTableInfoFromConversation", "bookTable")
  .addEdge("takeAway", "transfertCall")
  .addEdge("delivery", "transfertCall")
  .addEdge("transfertCall", "__end__")
  // Conditional edges
  .addConditionalEdges("understandRequest", understandRequestRoute)
  .addConditionalEdges("bookTable", bookTableRoute)
  .addConditionalEdges("bookTableConfirmation", bookTableConfirmationRoute)

const app = workflow.compile();

// Funzione principale
export async function runPizzeriaAgent() {  
  await app.invoke({ next: "start" });
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runPizzeriaAgent().catch(console.error);
}