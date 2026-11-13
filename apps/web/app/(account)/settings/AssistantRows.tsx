"use client";

import { type Assistant, isScope, SCOPES } from "@app/shared";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { browserApi, errorMessage } from "@/lib/api-client";

const day = (value: string) => new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });

/** "Can: see your account… Last used Nov 13, 2026." */
function describe(assistant: Assistant): string {
  const can = assistant.scopes
    .filter(isScope)
    .map((scope) => SCOPES[scope].replace(/\.$/, "").toLowerCase())
    .join("; ");
  const used = assistant.lastUsedAt
    ? `Last used ${day(assistant.lastUsedAt)}`
    : `Connected ${day(assistant.createdAt)}, not used yet`;
  return `Can ${can}. ${used}.`;
}

export function AssistantRows({ initial }: { initial: Assistant[] }) {
  const [assistants, setAssistants] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const disconnect = async (id: string) => {
    setError(null);
    try {
      await browserApi().account.assistants.revoke({ id });
      setAssistants((current) => current.filter((assistant) => assistant.id !== id));
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  if (assistants.length === 0) return <Text color="secondary">No assistants are connected.</Text>;

  return (
    <VStack gap={3}>
      {error && <Banner status="error" title={error} />}
      <List hasDividers>
        {assistants.map((assistant) => (
          <ListItem
            key={assistant.id}
            label={assistant.name}
            description={
              <Text type="supporting" color="secondary">
                {describe(assistant)}
              </Text>
            }
            endContent={<Button label="Disconnect" size="sm" clickAction={() => disconnect(assistant.id)} />}
          />
        ))}
      </List>
    </VStack>
  );
}
