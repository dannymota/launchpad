// The API contract: every action the product offers, defined once.
//
// The backend implements it (packages/backend/src/api). The same definitions become the
// typed client for web and mobile (/rpc), a REST endpoint with an OpenAPI document (/api),
// and, for the procedures apps/mcp lists in a server's scopes.ts, an MCP tool. `summary` and
// `description` are read by people in the API docs and by models choosing a tool, so write
// them for both.
//
// Clients import this file's TYPE only (see ../client.ts), so none of it ships to a browser
// or a phone.
import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import * as z from "zod";
import { AdminUserSchema, AssistantSchema, OkSchema, SessionSchema, UserSchema } from "../schemas/account";
// >>> ai
import { AiAnswerStreamSchema, AiBudgetSchema } from "../schemas/ai";
// <<< ai

// Two namespaces are tied to an access area, so the edge can tell them apart by path:
//   public.*  what the public site calls without a sign-in. REST paths start with /public/.
//   admin.*   what only admins call. Always behind Cloudflare Access. REST paths start with /admin/.
// tests/contract.test.ts holds every procedure to this.
export const contract = {
  system: {
    ping: oc
      .meta(
        openapi({
          method: "GET",
          path: "/ping",
          operationId: "ping",
          summary: "Check the API is up",
          description: "Returns the server time. Needs no sign-in.",
        }),
      )
      .output(z.object({ ok: z.literal(true), time: z.iso.datetime() })),
  },
  account: {
    whoami: oc
      .meta(
        openapi({
          method: "GET",
          path: "/account/whoami",
          operationId: "whoami",
          summary: "Who am I",
          description: "Returns the account this request is acting for: its id, email and display name.",
        }),
      )
      .output(UserSchema),
    sessions: {
      list: oc
        .meta(
          openapi({
            method: "GET",
            path: "/account/sessions",
            operationId: "listSessions",
            summary: "List where I am signed in",
            description: "Returns the browsers and apps currently signed in to this account, newest first.",
          }),
        )
        .output(z.object({ sessions: z.array(SessionSchema) })),
      revoke: oc
        .meta(
          openapi({
            method: "POST",
            path: "/account/sessions/revoke",
            operationId: "revokeSession",
            summary: "Sign out one browser or app",
            description: "Ends one of this account's sessions by id. That browser or app must sign in again.",
          }),
        )
        .input(z.object({ id: z.string().min(1).max(200) }))
        .output(OkSchema),
    },
    // >>> mcp
    assistants: {
      list: oc
        .meta(
          openapi({
            method: "GET",
            path: "/account/assistants",
            operationId: "listAssistants",
            summary: "List connected assistants",
            description: "Returns the assistants connected to this account, with what each is allowed to do.",
          }),
        )
        .output(z.object({ assistants: z.array(AssistantSchema) })),
      revoke: oc
        .meta(
          openapi({
            method: "POST",
            path: "/account/assistants/revoke",
            operationId: "revokeAssistant",
            summary: "Disconnect an assistant",
            description:
              "Ends one assistant connection by id. It stops working at once and must be connected again to return.",
          }),
        )
        .input(z.object({ id: z.string().min(1).max(200) }))
        .output(OkSchema),
    },
    // <<< mcp
    delete: oc
      .meta(
        openapi({
          method: "POST",
          path: "/account/delete",
          operationId: "deleteAccount",
          summary: "Delete my account",
          description:
            "Permanently deletes this account, its sessions and its assistant connections. Needs a sign-in from the last few minutes. Cannot be undone.",
        }),
      )
      .input(z.object({ confirm: z.literal("delete my account") }))
      .output(OkSchema),
  },
  // >>> ai
  ai: {
    ask: oc
      .meta(
        openapi({
          method: "POST",
          path: "/ai/ask",
          operationId: "askAi",
          summary: "Ask the assistant a question",
          description:
            "Streams the model's answer as it is written, ending with how it finished. Each call counts against this month's AI budget and is refused once that is spent.",
        }),
      )
      .input(z.object({ prompt: z.string().trim().min(1).max(4000) }))
      .output(AiAnswerStreamSchema),
    budget: oc
      .meta(
        openapi({
          method: "GET",
          path: "/ai/budget",
          operationId: "aiBudget",
          summary: "How much of my AI budget is left",
          description: "Returns what this account has used of its share of this month's AI budget.",
        }),
      )
      .output(AiBudgetSchema),
  },
  // <<< ai
  // >>> payments
  billing: {
    current: oc
      .meta(
        openapi({
          method: "GET",
          path: "/billing/current",
          operationId: "currentPlan",
          summary: "Which plan am I on",
          description: "Returns the plan this account is on right now, and whether a paid plan is set to end.",
        }),
      )
      .output(
        z.object({
          plan: z.string().describe('The plan\'s id from the product config, e.g. "free" or "pro".'),
          status: z.string().describe('"none" on the free plan; otherwise "active" or "trialing".'),
          endsAtPeriodEnd: z
            .boolean()
            .describe("True when a paid plan was cancelled and runs out at the end of the period."),
        }),
      ),
  },
  // <<< payments
  admin: {
    users: {
      list: oc
        .meta(
          openapi({
            method: "GET",
            path: "/admin/users",
            operationId: "adminListUsers",
            summary: "List accounts",
            description: "Returns accounts, newest first. Pass `before` from the previous page to get the next one.",
          }),
        )
        .input(
          z.object({
            limit: z.coerce.number().int().min(1).max(100).default(50),
            before: z.iso.datetime().optional().describe("Return accounts created before this time."),
          }),
        )
        .output(z.object({ users: z.array(AdminUserSchema), next: z.iso.datetime().nullable() })),
      setBanned: oc
        .meta(
          openapi({
            method: "POST",
            path: "/admin/users/ban",
            operationId: "adminSetBanned",
            summary: "Ban or unban an account",
            description:
              "Banning signs the account out everywhere, disconnects its assistants and stops it signing in again.",
          }),
        )
        .input(z.object({ userId: z.string().min(1).max(200), banned: z.boolean() }))
        .output(OkSchema),
    },
  },
};

export type AppContract = typeof contract;
