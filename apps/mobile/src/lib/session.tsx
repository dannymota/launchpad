// The signed-in state for the whole app, read once at the root.
import { createContext, type ReactNode, useContext } from "react";
import { authClient } from "./auth";

interface SessionState {
  /** True until the stored session has been checked. The splash stays up meanwhile. */
  loading: boolean;
  user: { id: string; email: string; name: string } | null;
}

const SessionContext = createContext<SessionState>({ loading: true, user: null });

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = authClient.useSession();
  const user = data?.user ? { id: data.user.id, email: data.user.email, name: data.user.name } : null;
  return <SessionContext.Provider value={{ loading: isPending, user }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
