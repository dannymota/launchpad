// Labs: pages still being worked on (Astryx template: blank). Internal in every preset, so
// work in progress under /labs is never public. Add a page as app/labs/<name>/page.tsx.
import { Button } from "@astryxdesign/core/Button";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Heading } from "@astryxdesign/core/Text";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Labs", robots: { index: false } };

export default function LabsPage() {
  return (
    <Layout
      header={
        <LayoutHeader hasDivider>
          <HStack vAlign="center" gap={2}>
            <StackItem size="fill">
              <Heading level={1}>Labs</Heading>
            </StackItem>
            {/* >>> ai */}
            <Button label="Ask the assistant" href="/labs/ai" />
            {/* <<< ai */}
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <List hasDividers>
            <ListItem
              label="The brand"
              description="The colours, corners and text sizes the theme sets, on real components."
              href="/labs/brand"
            />
          </List>
        </LayoutContent>
      }
    />
  );
}
