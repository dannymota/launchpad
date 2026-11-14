"use client";

// Email sign-in in two steps: ask for the address, then for the code mailed to it.
// Frame from the Astryx template login-card.
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Divider } from "@astryxdesign/core/Divider";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useEarlyInput } from "@/lib/early-input";
import { TurnstileWidget } from "./TurnstileWidget";

const CODE_LENGTH = 6;

interface Methods {
  emailCode: boolean;
  google: boolean;
  apple: boolean;
}

export function SignInForm(props: {
  next: string;
  methods: Methods;
  /** Set when the code request is checked by Cloudflare Turnstile. */
  turnstileSiteKey: string | null;
}) {
  const { next, methods, turnstileSiteKey } = props;
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const emailField = useEarlyInput(setEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const result = await authClient.emailOtp.sendVerificationOtp(
      { email: email.trim(), type: "sign-in" },
      turnstileToken ? { headers: { "x-turnstile-token": turnstileToken } } : undefined,
    );
    setBusy(false);
    if (result.error) {
      setError("We couldn't send a code. Check the address and try again.");
      return;
    }
    setCode("");
    setStep("code");
  };

  const signIn = async () => {
    setBusy(true);
    setError(null);
    const result = await authClient.signIn.emailOtp({ email: email.trim(), otp: code.trim() });
    if (result.error) {
      setBusy(false);
      setError("That code didn't work. Check it, or send a new one.");
      return;
    }
    // A full navigation: `next` may be a Worker route (the assistant connection flow), not a page.
    window.location.assign(next);
  };

  const social = async (provider: "google" | "apple") => {
    setError(null);
    const result = await authClient.signIn.social({ provider, callbackURL: next });
    if (result.error) setError("That sign-in didn't start. Try again.");
  };
  const hasSocial = methods.google || methods.apple;

  return (
    <Center axis="both" padding={6} minHeight="100dvh">
      <VStack gap={4} hAlign="center" width="100%" maxWidth={400}>
        <Card padding={8} width="100%">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void (step === "email" ? sendCode() : signIn());
            }}
          >
            {/* Enter pressed before this code runs reloads the page (a plain form submit). This keeps the destination. */}
            <input type="hidden" name="next" value={next} />
            <VStack gap={4} hAlign="stretch">
              <VStack gap={1} hAlign="center">
                <Heading level={2} accessibilityLevel={1}>
                  {step === "email" ? "Sign in" : "Enter your code"}
                </Heading>
                <Text type="body" color="secondary" size="sm" justify="center">
                  {step === "code"
                    ? `We sent a ${CODE_LENGTH}-digit code to ${email.trim()}.`
                    : methods.emailCode
                      ? "We'll email you a code. No password needed."
                      : "Choose how to sign in."}
                </Text>
              </VStack>

              {step === "code" ? (
                <TextInput
                  label="Code"
                  value={code}
                  onChange={setCode}
                  size="lg"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  hasAutoFocus
                  status={error ? { type: "error", message: error } : undefined}
                />
              ) : (
                methods.emailCode && (
                  <TextInput
                    ref={emailField}
                    label="Email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={setEmail}
                    size="lg"
                    autoComplete="email"
                    hasAutoFocus
                    status={error ? { type: "error", message: error } : undefined}
                  />
                )
              )}

              {step === "email" && methods.emailCode && turnstileSiteKey && (
                <TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
              )}

              {(methods.emailCode || step === "code") && (
                <Button
                  label={step === "email" ? "Send code" : "Sign in"}
                  variant="primary"
                  size="lg"
                  type="submit"
                  isLoading={busy}
                  isDisabled={
                    step === "email"
                      ? !email.trim() || Boolean(turnstileSiteKey && !turnstileToken)
                      : code.trim().length !== CODE_LENGTH
                  }
                />
              )}
              {step === "code" && (
                <Button
                  label="Use a different email"
                  variant="ghost"
                  onClick={() => {
                    setStep("email");
                    setError(null);
                  }}
                />
              )}

              {step === "email" && hasSocial && (
                <>
                  {methods.emailCode && <Divider label="Or continue with" />}
                  <VStack gap={3} hAlign="stretch">
                    {methods.apple && (
                      <Button label="Continue with Apple" size="lg" clickAction={() => social("apple")} />
                    )}
                    {methods.google && (
                      <Button label="Continue with Google" size="lg" clickAction={() => social("google")} />
                    )}
                  </VStack>
                  {!methods.emailCode && error && (
                    <Text color="secondary" size="sm" justify="center">
                      {error}
                    </Text>
                  )}
                </>
              )}
            </VStack>
          </form>
        </Card>
      </VStack>
    </Center>
  );
}
