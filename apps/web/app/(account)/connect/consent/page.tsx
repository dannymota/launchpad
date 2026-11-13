// The consent step of connecting an assistant. GET /authorize (apps/mcp/oauth/consent.ts)
// sends the browser here with a handle bound to the signed-in person; the form posts the
// decision back to /authorize.
import { readConsent } from "@app/backend";
import { isScope, REQUIRED_SCOPE, SCOPES } from "@app/shared";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { Metadata } from "next";
import { getEnv, requireUser } from "@/lib/server";
import { ConsentForm } from "./ConsentForm";

export const metadata: Metadata = { title: "Connect an assistant", robots: { index: false } };

export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const handle = (await searchParams).h ?? "";
  const principal = await requireUser(`/connect/consent?h=${encodeURIComponent(handle)}`);
  const pending = handle ? await readConsent(getEnv(), handle, principal.userId) : null;

  return (
    <Center axis="both" padding={6} minHeight="100dvh">
      <VStack gap={4} hAlign="center" width="100%" maxWidth={440}>
        <Card padding={8} width="100%">
          {pending ? (
            <ConsentForm
              handle={handle}
              account={principal.email}
              clientName={pending.clientName}
              clientDomain={pending.clientDomain}
              redirectHost={pending.redirectHost}
              scopes={pending.scopes.filter(isScope).map((scope) => ({
                id: scope,
                label: SCOPES[scope],
                isRequired: scope === REQUIRED_SCOPE,
              }))}
            />
          ) : (
            <VStack gap={2} hAlign="center">
              <Heading level={2} accessibilityLevel={1} justify="center">
                This page is no longer active
              </Heading>
              <Text color="secondary" justify="center">
                It expired or was already used. Go back to your assistant and connect again.
              </Text>
            </VStack>
          )}
        </Card>
      </VStack>
    </Center>
  );
}
