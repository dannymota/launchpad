import * as z from "zod";

/** The signed-in person, as every surface sees them. */
export const UserSchema = z.object({
  id: z.string().describe("Stable account id."),
  email: z.email().describe("The account's verified email address."),
  name: z.string().describe("Display name; empty when the person has not set one."),
});
export type User = z.infer<typeof UserSchema>;
