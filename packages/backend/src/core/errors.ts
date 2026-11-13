/**
 * An error whose message is safe to show the person who caused it. Anything else that
 * reaches a handler boundary is logged and answered with a generic 500.
 */
export class UserError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "UserError";
  }
}

/** Thrown at startup when a required setting is missing, so a misconfigured deploy fails loudly. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}
