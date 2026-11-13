"use client";

// A plain form post to /authorize: the decision works without JavaScript beyond the checkboxes,
// and the browser follows the Worker's answer back to the assistant.
import { Button } from "@astryxdesign/core/Button";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useState } from "react";

interface ScopeChoice {
  id: string;
  label: string;
  isRequired: boolean;
}

export function ConsentForm(props: {
  handle: string;
  account: string;
  clientName: string;
  /** Empty when the assistant's name could not be verified against a domain. */
  clientDomain: string;
  redirectHost: string;
  scopes: ScopeChoice[];
}) {
  const [chosen, setChosen] = useState(() => props.scopes.map((scope) => scope.id));
  const required = props.scopes.filter((scope) => scope.isRequired).map((scope) => scope.id);

  return (
    <form method="post" action="/authorize">
      <input type="hidden" name="handle" value={props.handle} />
      {chosen.map((scope) => (
        <input key={scope} type="hidden" name="scope" value={scope} />
      ))}
      <VStack gap={6} hAlign="stretch">
        <VStack gap={1} hAlign="center">
          <Heading level={2} accessibilityLevel={1} justify="center" textWrap="balance">
            Connect {props.clientName}?
          </Heading>
          <Text color="secondary" size="sm" justify="center">
            {props.clientDomain
              ? `${props.clientName} (${props.clientDomain}) is asking to use your account, ${props.account}.`
              : `An assistant calling itself ${props.clientName} is asking to use your account, ${props.account}. Its name is not verified.`}
          </Text>
        </VStack>

        <CheckboxList
          label="It will be able to"
          value={chosen}
          onChange={(values) => setChosen([...new Set([...required, ...values])])}
          hasDividers
        >
          {props.scopes.map((scope) => (
            // A Text label wraps; a plain string would be cut to one line, hiding what is being allowed.
            <CheckboxListItem
              key={scope.id}
              value={scope.id}
              label={<Text>{scope.label}</Text>}
              aria-label={scope.label}
              isDisabled={scope.isRequired}
            />
          ))}
        </CheckboxList>

        <Text type="supporting" color="secondary">
          You'll return to {props.redirectHost}. You can remove this connection at any time.
        </Text>

        <HStack gap={3} justify="end">
          <Button label="Cancel" type="submit" name="decision" value="deny" />
          <Button label="Connect" variant="primary" type="submit" name="decision" value="approve" />
        </HStack>
      </VStack>
    </form>
  );
}
