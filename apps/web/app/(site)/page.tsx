// The public landing page (Astryx template: centered-hero). /site replaces its words from
// product/brief.md; the frame, gaps and padding stay.
import { productOf } from "@app/backend";
import { Button } from "@astryxdesign/core/Button";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { getEnv } from "@/lib/server";

export default function LandingPage() {
  const { name, tagline } = productOf(getEnv());
  return (
    <Layout
      content={
        <LayoutContent padding={6}>
          <VStack gap={10}>
            <VStack gap={6} hAlign="center">
              <VStack gap={3} hAlign="center">
                <Heading level={1} type="display-2" justify="center" textWrap="balance">
                  {name}
                </Heading>
                <Text type="body" color="secondary" justify="center" textWrap="balance">
                  {tagline}
                </Text>
              </VStack>
              <HStack gap={3}>
                <Button label="Open the app" variant="primary" href="/app" />
                <Button label="Sign in" variant="secondary" href="/sign-in" />
              </HStack>
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
