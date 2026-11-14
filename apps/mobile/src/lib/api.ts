// The typed API client: the same contract the web app and assistants use. Each call carries
// the stored session.
import { createApiClient } from "@app/shared/client";
import { authClient } from "./auth";
import { ACCESS_HEADERS, API_ORIGIN } from "./config";

export const api = createApiClient({
  origin: API_ORIGIN,
  headers: async () => ({ ...ACCESS_HEADERS, cookie: await authClient.getCookie() }),
});

/** The message to show for a failed call. */
export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Something went wrong. Try again.";
}
