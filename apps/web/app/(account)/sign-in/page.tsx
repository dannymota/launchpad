import { captchaOn, productOf, signInMethods } from "@app/backend";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safePath } from "@/lib/request";
import { getEnv, pagePrincipal } from "@/lib/server";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

/** Shown when there is no form to offer: a short explanation in the same frame as the form. */
function Notice({ title, children }: { title: string; children: string }) {
  return (
    <Center axis="both" padding={6} minHeight="100dvh">
      <VStack gap={4} hAlign="center" width="100%" maxWidth={400}>
        <Card padding={8} width="100%">
          <VStack gap={1} hAlign="center">
            <Heading level={2} accessibilityLevel={1} justify="center">
              {title}
            </Heading>
            <Text type="body" color="secondary" size="sm" justify="center">
              {children}
            </Text>
          </VStack>
        </Card>
      </VStack>
    </Center>
  );
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safePath((await searchParams).next, "/app");
  if (await pagePrincipal()) redirect(next);

  const env = getEnv();
  if (productOf(env).areas.signIn.identity === "access") {
    // Cloudflare Access is the sign-in here, and it let this request through without an account we can use.
    return <Notice title="This account can't be used here">Ask whoever runs this product to check your access.</Notice>;
  }
  const methods = signInMethods(env);
  if (!methods.emailCode && !methods.google && !methods.apple) {
    return <Notice title="Sign-in isn't set up yet">Check back soon.</Notice>;
  }
  const turnstileSiteKey = captchaOn(env) ? (env.TURNSTILE_SITE_KEY ?? null) : null;
  return <SignInForm next={next} methods={methods} turnstileSiteKey={turnstileSiteKey} />;
}
