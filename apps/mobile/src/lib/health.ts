// What the server offers this build: which sign-in methods are on, and the oldest app
// version it still serves. Read once at launch.

import { compareVersions } from "@app/shared/version";
import { useCallback, useEffect, useRef, useState } from "react";
import { ACCESS_HEADERS, API_ORIGIN, APP_VERSION } from "./config";

export interface ServerInfo {
  signIn: { emailCode: boolean; google: boolean; apple: boolean; captcha: boolean };
  /** True when this build is older than the server accepts. */
  mustUpdate: boolean;
}

type State = { status: "loading" } | { status: "ready"; info: ServerInfo } | { status: "unreachable" };

export function useServerInfo(): State & { retry(): void } {
  const [state, setState] = useState<State>({ status: "loading" });
  // Only the newest request may set the state: an earlier one can still be in flight after a retry.
  const latest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latest.current;
    setState({ status: "loading" });
    try {
      const response = await fetch(`${API_ORIGIN}/health`, { headers: ACCESS_HEADERS });
      if (!response.ok) throw new Error(String(response.status));
      const health = (await response.json()) as { signIn: ServerInfo["signIn"]; mobile: { minVersion: string } | null };
      const mustUpdate = health.mobile ? compareVersions(APP_VERSION, health.mobile.minVersion) < 0 : false;
      if (request === latest.current) setState({ status: "ready", info: { signIn: health.signIn, mustUpdate } });
    } catch {
      if (request === latest.current) setState({ status: "unreachable" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, retry: () => void load() };
}
