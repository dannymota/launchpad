// AI: model calls with a monthly spending cap. On when ANTHROPIC_API_KEY is set; until
// then the example procedure answers "not set up" and nothing is spent.
//
//   settings.ts   what the Worker's variables say
//   prices.ts     what a call costs
//   ledger.ts     the budget: hold before a call, settle after
//   runner.ts     the call itself
import type { BackendModule } from "../../core/modules";
import { aiOn } from "./settings";

export const ai: BackendModule = { name: "ai", on: aiOn };
