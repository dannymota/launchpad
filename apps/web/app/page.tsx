// The public landing page (Astryx template: centered-hero). /site replaces its words from
// product/brief.md; the frame, gaps and padding stay.
import { Button } from "@astryxdesign/core/Button";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";

export default function LandingPage() {
  return (
    <Layout
      content={
        <LayoutContent padding={6}>
          <VStack gap={10}>
            <VStack gap={6} hAlign="center">
              <VStack gap={3} hAlign="center">
                <Heading level={1} type="display-2" justify="center" textWrap="balance">
                  Launchpad
                </Heading>
                <Text type="body" color="secondary" justify="center" textWrap="balance">
                  A starting point with sign-in, an API and an assistant connection already working.
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
