import { eventIterator } from "@orpc/contract";
import * as z from "zod";

/** One step of a streamed answer. The last event is always "done". */
export const AiAnswerEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().describe("The next piece of the answer.") }),
  z.object({
    type: z.literal("done"),
    outcome: z
      .enum(["complete", "cut_short", "refused", "failed"])
      .describe(
        '"complete": the whole answer arrived. "cut_short": it hit the length limit. "refused": the model declined; discard any text received. "failed": the call broke; try again.',
      ),
  }),
]);
export type AiAnswerEvent = z.infer<typeof AiAnswerEventSchema>;
/** The answer as a stream of those events. */
export const AiAnswerStreamSchema = eventIterator(AiAnswerEventSchema);

export const AiBudgetSchema = z.object({
  on: z.boolean().describe("False until AI is set up for this product."),
  month: z.string().describe('The month the figures are for, e.g. "2026-11".'),
  usedUsd: z.number().describe("Dollars this account has used this month."),
  limitUsd: z.number().describe("Dollars one account may use in a month."),
  open: z.boolean().describe("True while a new question would be accepted."),
});
