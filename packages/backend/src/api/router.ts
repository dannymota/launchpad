// The implementation of packages/shared/src/contract. One entry per contract procedure;
// `os.router` fails to compile when one is missing or has the wrong shape.
import { deleteAccount, listSessions, revokeSession } from "../accounts/account";
import { listUsers, setBanned } from "../accounts/admin";
import { listGrants, revokeGrant } from "../accounts/assistants";
import { adminOnly, inPerson, os, signedIn, userErrors } from "./base";

const ok = { ok: true as const };

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
    sessions: {
      list: os.account.sessions.list.use(inPerson).handler(async ({ context }) => ({
        sessions: await listSessions(context.env, context.principal),
      })),
      revoke: os.account.sessions.revoke.use(inPerson).handler(async ({ context, input }) => {
        await revokeSession(context.env, context.principal, input.id);
        return ok;
      }),
    },
    assistants: {
      list: os.account.assistants.list.use(inPerson).handler(async ({ context }) => ({
        assistants: (await listGrants(context.env, context.principal.userId)).map((grant) => ({
          id: grant.id,
          name: grant.clientName,
          scopes: grant.scopes,
          createdAt: grant.createdAt,
          lastUsedAt: grant.lastUsedAt,
        })),
      })),
      revoke: os.account.assistants.revoke.use(inPerson).handler(async ({ context, input }) => {
        await revokeGrant(context.env, context.principal.userId, input.id);
        return ok;
      }),
    },
    delete: os.account.delete.use(inPerson).handler(async ({ context }) => {
      await userErrors(() => deleteAccount(context.env, context.principal));
      return ok;
    }),
  },
  admin: {
    users: {
      list: os.admin.users.list.use(adminOnly).handler(({ context, input }) => listUsers(context.env, input)),
      setBanned: os.admin.users.setBanned.use(adminOnly).handler(async ({ context, input }) => {
        await userErrors(() => setBanned(context.env, context.principal, input.userId, input.banned));
        return ok;
      }),
    },
  },
});

export type AppRouter = typeof router;
