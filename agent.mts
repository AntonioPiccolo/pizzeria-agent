import dotenv from 'dotenv';
import { StateGraph, Annotation } from "@langchain/langgraph";
import { understandRequest } from './nodes/understandRequest.mjs';
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
  })
});

// Nodo iniziale
async function start(state: typeof StateAnnotation.State) {
  const question = "Salve, sono l'assistente vocale della pizzeria Al Fornareto, come posso aiutarla?";
  console.log(question);

  const conversation = addConversationMessage(state.conversation, "Salve, sono l'assistente vocale della pizzeria Al Fornareto, come posso aiutarla?", "agent");

  return { next: "understandRequest", conversation: conversation };
}

// Routing
function understandRequestRoute(state: typeof StateAnnotation.State): string {
  switch (state.next) {
    case "start":
      return "start";
    case "understandRequest":
      return "understandRequest";
    case "transfertCall":
      return "transfertCall";
    case "end":
      return "__end__";
    default:
      return "__end__";
  }
}

// Graph construction
const workflow = new StateGraph(StateAnnotation)
  // Nodes
  .addNode("start", start)
  .addNode("understandRequest", understandRequest)
  .addNode("transfertCall", transfertCall)
  // Edges
  .addEdge("__start__", "start")
  .addEdge("start", "understandRequest")
  // Conditional edges
  .addConditionalEdges("understandRequest", understandRequestRoute)
  .addEdge("transfertCall", "__end__")

const app = workflow.compile();

// Funzione principale
export async function runPizzeriaAgent() {  
  await app.invoke({ next: "start" });
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runPizzeriaAgent().catch(console.error);
}