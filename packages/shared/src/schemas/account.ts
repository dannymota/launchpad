import * as z from "zod";

/** The signed-in person, as every surface sees them. */
export const UserSchema = z.object({
  id: z.string().describe("Stable account id."),
  email: z.email().describe("The account's verified email address."),
  name: z.string().describe("Display name; empty when the person has not set one."),
});
export type User = z.infer<typeof UserSchema>;

/** One place the person is signed in. Never carries the session's secret. */
export const SessionSchema = z.object({
  id: z.string(),
  current: z.boolean().describe("True for the session making this request."),
  createdAt: z.iso.datetime(),
  userAgent: z.string().describe("The browser or app that signed in; empty when unknown."),
});
export type Session = z.infer<typeof SessionSchema>;

// >>> mcp
/** An assistant (an MCP client) the person connected to their account. */
export const AssistantSchema = z.object({
  id: z.string(),
  name: z.string().describe("The name the assistant gave when it connected."),
  scopes: z.array(z.string()).describe("What the person allowed it to do."),
  createdAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime().nullable().describe("Roughly when it last made a call; null if never."),
});
export type Assistant = z.infer<typeof AssistantSchema>;
// <<< mcp

/** An account, as an admin sees it. */
export const AdminUserSchema = UserSchema.extend({
  createdAt: z.iso.datetime(),
  banned: z.boolean(),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;

export const OkSchema = z.object({ ok: z.literal(true) });
