"use client";

import type { Session } from "@app/shared";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { browserApi, errorMessage } from "@/lib/api-client";

/** "Chrome on macOS" from a user-agent string; the raw string when it is something else. */
function describe(userAgent: string): string {
  if (!userAgent) return "Unknown browser or app";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : null;
  const system = /iPhone|iPad/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;
  return browser && system ? `${browser} on ${system}` : userAgent.slice(0, 60);
}

export function SessionRows({ initial }: { initial: Session[] }) {
  const [sessions, setSessions] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const signOut = async (id: string) => {
    setError(null);
    try {
      await browserApi().account.sessions.revoke({ id });
      setSessions((current) => current.filter((session) => session.id !== id));
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  return (
    <VStack gap={3}>
      {error && <Banner status="error" title={error} />}
      <List hasDividers>
        {sessions.map((session) => (
          <ListItem
            key={session.id}
            label={describe(session.userAgent)}
            description={`Signed in ${new Date(session.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}`}
            endContent={
              session.current ? (
                <Text color="secondary">This browser</Text>
              ) : (
                <Button label="Sign out" size="sm" clickAction={() => signOut(session.id)} />
              )
            }
          />
        ))}
      </List>
    </VStack>
  );
}
