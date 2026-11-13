// Account settings (Astryx template: settings). One scrolling page: each section is a
// heading with a sentence beside what it controls.
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { Metadata } from "next";
import { api, requireUser } from "@/lib/server";
import { SignOutButton } from "../../_components/SignOutButton";
import { DeleteAccount } from "./DeleteAccount";
import { SessionRows } from "./SessionRows";

export const metadata: Metadata = { title: "Settings" };

function Section({ title, about, children }: { title: string; about: string; children: React.ReactNode }) {
  return (
    <Grid columns={{ minWidth: 320 }} gap={10}>
      <VStack gap={1}>
        <Heading level={3}>{title}</Heading>
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
              <List hasDividers>
                <ListItem label="Email" endContent={<Text>{principal.email}</Text>} />
                <ListItem
                  label="Sign-in"
                  endContent={<Text>{viaAccess ? "Cloudflare Access" : "This product's own sign-in"}</Text>}
                />
              </List>
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

            <Divider />
            <Section
              title="Delete account"
              about="Removes your account, its data and its assistant connections for good."
            >
              <DeleteAccount />
            </Section>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
