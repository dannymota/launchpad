"use client";

// The typed API client for code that runs in the browser. Server components call the API
// in-process instead (lib/server.ts).
import { type ApiClient, createApiClient } from "@app/shared/client";

let client: ApiClient | undefined;

export function browserApi(): ApiClient {
  client ??= createApiClient({ origin: window.location.origin });
  return client;
}

/** The API's codes for a failure that is the server's, not the person's (HTTP 500 and up). */
const SERVER_FAILURES = new Set(["INTERNAL_SERVER_ERROR", "NOT_IMPLEMENTED", "BAD_GATEWAY", "GATEWAY_TIMEOUT"]);

/** The message to show for a failed API call. */
export function errorMessage(error: unknown): string {
  // The request got no answer at all: offline, or the connection dropped.
  if (error instanceof TypeError) return "We couldn't reach the server. Check your connection and try again.";
  // A failure on the server has nothing in it a person can act on.
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === "string" && SERVER_FAILURES.has(code)) {
    return "Something went wrong on our side. Try again in a moment.";
  }
  return error instanceof Error && error.message ? error.message : "Something went wrong. Try again.";
}
