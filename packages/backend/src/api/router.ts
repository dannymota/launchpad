// The implementation of packages/shared/src/contract. One entry per contract procedure;
// `os.router` fails to compile when one is missing or has the wrong shape.
import { os, signedIn } from "./base";

export const router = os.router({
  system: {
    ping: os.system.ping.handler(() => ({ ok: true as const, time: new Date().toISOString() })),
  },
  account: {
    whoami: os.account.whoami.use(signedIn).handler(({ context }) => ({
      id: context.principal.userId,
      email: context.principal.email,
      name: context.principal.name,
    })),
  },
});

export type AppRouter = typeof router;
