// Account settings (Astryx template: settings). One scrolling page: each section is a
// heading with a sentence beside what it controls.
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { Metadata } from "next";
import { api, requireUser } from "@/lib/server";
import { SignOutButton } from "../../_components/SignOutButton";
import { AssistantRows } from "./AssistantRows";
import { DeleteAccount } from "./DeleteAccount";
import { SessionRows } from "./SessionRows";

export const metadata: Metadata = { title: "Settings" };

function Section({ title, about, children }: { title: string; about: string; children: React.ReactNode }) {
  return (
    <Grid columns={{ minWidth: 320 }} gap={10}>
      <VStack gap={1}>
        {/* Sized as a third-level heading; in the page's outline it comes right under "Settings". */}
        <Heading level={3} accessibilityLevel={2}>
          {title}
        </Heading>
        <Text type="supporting" color="secondary">
          {about}
        </Text>
      </VStack>
      <VStack gap={4}>{children}</VStack>
    </Grid>
  );
}

export default async function SettingsPage() {
  const principal = await requireUser("/settings");
  const viaAccess = principal.via === "access";
  const { sessions } = viaAccess ? { sessions: [] } : await api().account.sessions.list();
  // >>> mcp
  const { assistants } = await api().account.assistants.list();
  // <<< mcp

  return (
    <Layout
      height="fill"
      contentWidth={1440}
      header={
        <LayoutHeader hasDivider>
          <HStack vAlign="center">
            <StackItem size="fill">
              <Heading level={1}>Settings</Heading>
            </StackItem>
            <SignOutButton identity={viaAccess ? "access" : "session"} />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={4}>
          <VStack gap={4}>
            <Section title="Account" about="The email address you sign in with.">
              <MetadataList>
                <MetadataListItem label="Email">{principal.email}</MetadataListItem>
                <MetadataListItem label="Sign-in">
                  {viaAccess ? "Cloudflare Access" : "This product's own sign-in"}
                </MetadataListItem>
              </MetadataList>
            </Section>

            {!viaAccess && (
              <>
                <Divider />
                <Section
                  title="Where you're signed in"
                  about="Browsers and apps using your account. Sign out any you don't recognise."
                >
                  <SessionRows initial={sessions} />
                </Section>
              </>
            )}

            {/* >>> payments */}
            <Divider />
            <Section title="Plan" about="What you're on, and where to change it.">
              <HStack>
                <Button label="Plan and billing" href="/settings/billing" />
              </HStack>
            </Section>
            {/* <<< payments */}

            {/* >>> mcp */}
            <Divider />
            <Section
              title="Connected assistants"
              about="AI assistants you allowed to use your account. Disconnect one and it stops working at once."
            >
              <AssistantRows initial={assistants} />
            </Section>
            {/* <<< mcp */}

            <Divider />
            <Section title="Delete account" about="Removes your account and everything in it for good.">
              <DeleteAccount />
            </Section>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
