// The typed API client for every surface that is not the server: the browser and the
// mobile app. It needs the contract's type only, so no server code is bundled.
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterContractClient } from "@orpc/contract";
import type { AppContract } from "./contract";

export type ApiClient = RouterContractClient<AppContract>;

export interface ApiClientOptions {
  /** Origin of the Worker, e.g. "https://example.com". In a browser, pass `location.origin`. */
  origin: string;
  /** Extra headers per call. The mobile app sends its stored session here. */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  fetch?: typeof fetch;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const link = new RPCLink({
    origin: options.origin,
    url: "/rpc",
    headers: options.headers,
    fetch: options.fetch ? (url, init) => options.fetch!(url, init) : undefined,
  });
  return createORPCClient(link);
}
