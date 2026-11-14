// The signed-in product's home (Astryx template: blank). /feature adds the first real screen.
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { Metadata } from "next";
import { api, requireUser } from "@/lib/server";
import { SignOutButton } from "../../_components/SignOutButton";

export const metadata: Metadata = { title: "Home" };

export default async function AppHome() {
  const principal = await requireUser("/app");
  // The same procedure the mobile app and assistants call, run in-process.
  const me = await api().account.whoami();

  return (
    <Layout
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>
            <VStack gap={1}>
              <Heading level={1}>Home</Heading>
              <Text color="secondary">You're signed in. Your product's first screen goes here.</Text>
            </VStack>
            <MetadataList title="Account">
              <MetadataListItem label="Email">{me.email}</MetadataListItem>
              <MetadataListItem label="Account ID">
                <Code>{me.id}</Code>
              </MetadataListItem>
            </MetadataList>
            <HStack gap={3}>
              <Button label="Settings" href="/settings" />
              <SignOutButton identity={principal.via === "access" ? "access" : "session"} />
            </HStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
