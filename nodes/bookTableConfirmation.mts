import { StateAnnotation } from "../agent.mjs";

export async function bookTableConfirmation(state: typeof StateAnnotation.State) {
  console.info("[BOOK-TABLE-CONFIRMATION] Start node")

  console.info(state.call.bookTable)

  return { next: "__end__" };
}