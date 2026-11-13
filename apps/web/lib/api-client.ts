"use client";

// The typed API client for code that runs in the browser. Server components call the API
// in-process instead (lib/server.ts).
import { type ApiClient, createApiClient } from "@app/shared/client";

let client: ApiClient | undefined;

export function browserApi(): ApiClient {
  client ??= createApiClient({ origin: window.location.origin });
  return client;
}

/** The message to show for a failed API call. */
export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Something went wrong. Try again.";
}
