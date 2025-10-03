import dotenv from 'dotenv';
import { StateGraph, Annotation } from "@langchain/langgraph";
import { understandRequest } from './nodes/understandRequest.mjs';
import { bookTableInfoFromConversation } from './nodes/bookTableInfoFromConversation.mjs'
import { bookTable } from './nodes/bookTable.mjs'
import { takeAway } from './nodes/takeAway.mjs'
import { delivery } from './nodes/delivery.mjs'
import { transfertCall } from './nodes/transfertCall.mjs';
import { addConversationMessage } from './utils/prompt.mjs';

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

  return { next: "understandRequest", conversation };
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
  .addNode("understandRequest", understandRequest)
  .addNode("bookTableInfoFromConversation", bookTableInfoFromConversation)
  .addNode("bookTable", bookTable)
  .addNode("takeAway", takeAway)
  .addNode("delivery", delivery)
  .addNode("transfertCall", transfertCall)
  // Edges
  .addEdge("__start__", "start")
  .addEdge("start", "understandRequest")
  .addEdge("bookTableInfoFromConversation", "bookTable")
  .addEdge("bookTable", "__end__")
  .addEdge("takeAway", "__end__")
  .addEdge("delivery", "__end__")
  .addEdge("transfertCall", "__end__")
  // Conditional edges
  .addConditionalEdges("understandRequest", understandRequestRoute)
  .addConditionalEdges("bookTable", bookTableRoute)
  

const app = workflow.compile();

// Funzione principale
export async function runPizzeriaAgent() {  
  await app.invoke({ next: "start" });
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runPizzeriaAgent().catch(console.error);
}