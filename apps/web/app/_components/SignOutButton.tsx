"use client";

import { Button } from "@astryxdesign/core/Button";
import { authClient } from "@/lib/auth-client";

/**
 * Ends the sign-in. With a session, that is Better Auth's sign-out. Where the Cloudflare
 * Access email is the sign-in, it is Access's own sign-out address.
 */
export function SignOutButton({ identity }: { identity: "session" | "access" }) {
  if (identity === "access") return <Button label="Sign out" href="/cdn-cgi/access/logout" />;
  return (
    <Button
      label="Sign out"
      clickAction={async () => {
        await authClient.signOut();
        window.location.assign("/");
      }}
    />
  );
}
