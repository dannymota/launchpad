// The signed-in product's home (Astryx template: blank). /feature adds the first real screen.
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
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
            <List hasDividers header="Account">
              <ListItem label="Email" endContent={<Text>{me.email}</Text>} />
              <ListItem label="Account ID" endContent={<Code>{me.id}</Code>} />
            </List>
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
