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
import { UserSchema } from "../schemas/account";

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
  },
};

export type AppContract = typeof contract;
