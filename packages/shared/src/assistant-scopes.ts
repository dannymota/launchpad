// What a person can allow a connected assistant (an MCP client) to do. The consent page
// shows these sentences, the settings page lists them, and each MCP tool names the one it needs.

export const SCOPES = {
  "app:read": "See your account and the data in it.",
  "app:write": "Make changes in your account on your behalf.",
  offline_access: "Stay connected for up to 30 days without asking again.",
} as const;
export type Scope = keyof typeof SCOPES;

/** Granted on every connection: without it an assistant can do nothing useful. */
export const REQUIRED_SCOPE: Scope = "app:read";

export function isScope(value: string): value is Scope {
  return Object.hasOwn(SCOPES, value);
}
