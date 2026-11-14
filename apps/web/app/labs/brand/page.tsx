// The brand, shown: the colours, corners and text sizes the theme sets, on the components that
// use them. /brand looks here after `npm run theme` (`npm run shots` takes its picture in light
// and dark). Everything on it comes from packages/theme/src/brand.ts; nothing is set here.
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack, Layout, LayoutContent, LayoutHeader, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "The brand", robots: { index: false } };

function Part({ title, about, children }: { title: string; about: string; children: React.ReactNode }) {
  return (
    <VStack gap={3}>
      <VStack gap={1}>
        <Heading level={2}>{title}</Heading>
        <Text type="body" color="secondary" size="sm">
          {about}
        </Text>
      </VStack>
      {children}
    </VStack>
  );
}

export default function BrandPage() {
  return (
    <Layout
      header={
        <LayoutHeader hasDivider>
          <Heading level={1}>The brand</Heading>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={8} maxWidth={720}>
            <Part
              title="Actions"
              about="The accent is the main action. Everything else is neutral, or says it is dangerous."
            >
              <HStack gap={2} wrap="wrap">
                <Button label="Main action" variant="primary" />
                <Button label="Another action" />
                <Button label="Quiet action" variant="ghost" />
                <Button label="Delete" variant="destructive" />
                <Button label="Not available" variant="primary" isDisabled />
              </HStack>
              <Text type="body">
                Accent-coloured text is for links: <Link href="/labs">back to Labs</Link>.
              </Text>
            </Part>

            <Part
              title="Selection"
              about="The quiet accent fill marks the current row. Text on it has to stay readable."
            >
              <List hasDividers>
                <ListItem label="An ordinary row" description="Secondary text under a label" />
                <ListItem label="The selected row" description="Secondary text on the quiet accent fill" isSelected />
                <ListItem label="Another ordinary row" description="Secondary text under a label" />
              </List>
            </Part>

            <Part title="Fields and cards" about="Control and card corners, borders, and the surface a card sits on.">
              <Card padding={6}>
                <VStack gap={3}>
                  <TextInput label="A field" value="Text someone typed" isReadOnly />
                  <Text type="body" color="secondary" size="sm">
                    A card on the page. Cards are never nested.
                  </Text>
                </VStack>
              </Card>
            </Part>

            <Part
              title="States"
              about="These four colours come with the component library, not the brand. Look at them beside your accent."
            >
              <VStack gap={2}>
                <Banner status="info" title="For your information" description="A neutral note." />
                <Banner status="success" title="Done" description="Something worked." />
                <Banner status="warning" title="Check this" description="Something needs a look." />
                <Banner status="error" title="That failed" description="What went wrong, and what to do." />
              </VStack>
            </Part>

            <Part title="Text" about="One family. Sizes belong to the level, never to the page.">
              <VStack gap={2}>
                <Heading level={2} accessibilityLevel={3} type="display-2">
                  A display line
                </Heading>
                <Heading level={1} accessibilityLevel={3}>
                  A page title
                </Heading>
                <Heading level={3}>A section title</Heading>
                <Text type="body">Body text, at the size most of the product is read in.</Text>
                <Text type="body" color="secondary" size="sm">
                  Secondary text, for what supports the line above it.
                </Text>
              </VStack>
            </Part>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
