import type { Interface } from "readline/promises";
import { Order } from "./Order";

export class HomeOrder extends Order {
  async getAddress(_state: any, rl: Interface): Promise<any> {
    console.log("\nQual è l'indirizzo di consegna?");
    const address = await rl.question("\n> ");
    return { step: "domicilio-pizze", address };
  }
}