"use client";

// Email sign-in in two steps: ask for the address, then for the code mailed to it.
// Frame from the Astryx template login-card.
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const CODE_LENGTH = 6;

export function SignInForm({ next }: { next: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const result = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
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
            <VStack gap={4} hAlign="stretch">
              <VStack gap={1} hAlign="center">
                <Heading level={2} accessibilityLevel={1}>
                  {step === "email" ? "Sign in" : "Enter your code"}
                </Heading>
                <Text type="body" color="secondary" size="sm" justify="center">
                  {step === "email"
                    ? "We'll email you a code. No password needed."
                    : `We sent a ${CODE_LENGTH}-digit code to ${email.trim()}.`}
                </Text>
              </VStack>

              {step === "email" ? (
                <TextInput
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
              ) : (
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
              )}

              <Button
                label={step === "email" ? "Send code" : "Sign in"}
                variant="primary"
                size="lg"
                type="submit"
                isLoading={busy}
                isDisabled={step === "email" ? !email.trim() : code.trim().length !== CODE_LENGTH}
              />
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
            </VStack>
          </form>
        </Card>
      </VStack>
    </Center>
  );
}
