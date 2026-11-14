// Sign-in. The server says which methods are on (/health); the platform says which to offer
// first: Apple on iOS, Google on Android. After a successful sign-in the root layout replaces
// this screen with the app, so there is nothing to go back to.
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { authClient } from "@/lib/auth";
import { APP_NAME } from "@/lib/config";
import { type ServerInfo, useServerInfo } from "@/lib/health";
import { type Provider, platform } from "@/platform";
import { useTheme } from "@/theme";

const CODE_LENGTH = 6;
const PROVIDER_NAME: Record<Provider, string> = { apple: "Apple", google: "Google" };

function Notice({ title, body, action }: { title: string; body: string; action?: { label: string; onPress(): void } }) {
  const theme = useTheme();
  return (
    <Screen centered>
      <View style={{ gap: theme.space(2) }}>
        <Text style={{ color: theme.color.text, fontSize: 22, fontWeight: "700", textAlign: "center" }}>{title}</Text>
        <Text style={{ color: theme.color.textSecondary, fontSize: theme.bodySize, textAlign: "center" }}>{body}</Text>
      </View>
      {action ? <Button label={action.label} variant="secondary" onPress={action.onPress} /> : null}
    </Screen>
  );
}

function Form({ methods }: { methods: ServerInfo["signIn"] }) {
  const theme = useTheme();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"email" | Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providers = platform.providerOrder.filter((provider) => methods[provider]);
  // With Turnstile on, the code form needs a browser widget this app does not have.
  const emailOn = methods.emailCode && !methods.captcha;

  const fail = (message: string) => {
    platform.haptic("error");
    setError(message);
  };

  const withProvider = async (provider: Provider) => {
    setBusy(provider);
    setError(null);
    try {
      if (provider === "apple" && platform.appleSignIn) {
        const apple = await platform.appleSignIn();
        if (apple) {
          const result = await authClient.signIn.social({ provider: "apple", idToken: apple });
          if (result.error) fail("That sign-in didn't work. Try again.");
        }
      } else {
        const result = await authClient.signIn.social({ provider, callbackURL: "/" });
        if (result.error) fail("That sign-in didn't start. Try again.");
      }
    } catch {
      fail("That sign-in didn't work. Try again.");
    }
    setBusy(null);
  };

  const sendCode = async () => {
    setBusy("email");
    setError(null);
    const result = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
    setBusy(null);
    if (result.error) return fail("We couldn't send a code. Check the address and try again.");
    setCode("");
    setStep("code");
  };

  const signIn = async () => {
    setBusy("email");
    setError(null);
    const result = await authClient.signIn.emailOtp({ email: email.trim(), otp: code.trim() });
    setBusy(null);
    if (result.error) return fail("That code didn't work. Check it, or send a new one.");
    platform.haptic("success");
  };

  if (providers.length === 0 && !emailOn) {
    return <Notice title="Sign-in isn't available yet" body="Check back soon." />;
  }

  return (
    <Screen centered>
      <View style={{ gap: theme.space(2) }}>
        <Text style={{ color: theme.color.text, fontSize: 34, fontWeight: "700" }}>
          {step === "email" ? APP_NAME : "Enter your code"}
        </Text>
        <Text style={{ color: theme.color.textSecondary, fontSize: theme.bodySize }}>
          {step === "email" ? "Sign in to continue." : `We sent a ${CODE_LENGTH}-digit code to ${email.trim()}.`}
        </Text>
      </View>

      {step === "email" ? (
        <View style={{ gap: theme.space(3) }}>
          {providers.map((provider) =>
            provider === "apple" && platform.AppleButton ? (
              <platform.AppleButton
                key={provider}
                dark={theme.scheme === "dark"}
                radius={theme.radius.element}
                onPress={() => void withProvider("apple")}
              />
            ) : (
              <Button
                key={provider}
                label={`Continue with ${PROVIDER_NAME[provider]}`}
                variant={emailOn ? "secondary" : "primary"}
                loading={busy === provider}
                disabled={busy !== null}
                onPress={() => void withProvider(provider)}
                testID={`sign-in-${provider}`}
              />
            ),
          )}
        </View>
      ) : null}

      {emailOn ? (
        <View style={{ gap: theme.space(3) }}>
          {step === "email" ? (
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={() => void sendCode()}
              error={error}
              testID="email"
            />
          ) : (
            <Field
              label="Code"
              value={code}
              onChangeText={setCode}
              autoComplete="one-time-code"
              autoFocus
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              textContentType="oneTimeCode"
              error={error}
              style={{ fontVariant: ["tabular-nums"], letterSpacing: 4 }}
              testID="code"
            />
          )}
          <Button
            label={step === "email" ? "Send code" : "Sign in"}
            loading={busy === "email"}
            disabled={busy !== null || (step === "email" ? !email.trim() : code.trim().length !== CODE_LENGTH)}
            onPress={() => void (step === "email" ? sendCode() : signIn())}
            testID="submit"
          />
          {step === "code" ? (
            <Button
              label="Use a different email"
              variant="plain"
              onPress={() => {
                setStep("email");
                setError(null);
              }}
            />
          ) : null}
        </View>
      ) : error ? (
        <Text style={{ color: theme.color.danger, fontSize: theme.bodySize - 2, textAlign: "center" }}>{error}</Text>
      ) : null}
    </Screen>
  );
}

export default function SignIn() {
  const theme = useTheme();
  const server = useServerInfo();

  if (server.status === "loading") {
    return (
      <Screen centered>
        <ActivityIndicator color={theme.color.accent} />
      </Screen>
    );
  }
  if (server.status === "unreachable") {
    return (
      <Notice
        title={`Can't reach ${APP_NAME}`}
        body="Check your connection and try again."
        action={{ label: "Try again", onPress: server.retry }}
      />
    );
  }
  if (server.info.mustUpdate) {
    return (
      <Notice
        title={`Update ${APP_NAME}`}
        body="This version is no longer supported. Install the latest one to continue."
      />
    );
  }
  return <Form methods={server.info.signIn} />;
}
