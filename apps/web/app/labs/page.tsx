// Labs: pages still being worked on (Astryx template: blank). Internal in every preset, so
// work in progress under /labs is never public. Add a page as app/labs/<name>/page.tsx.
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Heading } from "@astryxdesign/core/Text";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Labs", robots: { index: false } };

export default function LabsPage() {
  return (
    <Layout
      header={
        <LayoutHeader hasDivider>
          <Heading level={1}>Labs</Heading>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <EmptyState
            title="Nothing in the lab yet"
            description="Pages under /labs stay behind Cloudflare Access, whatever the rest of the product is set to."
          />
        </LayoutContent>
      }
    />
  );
}
