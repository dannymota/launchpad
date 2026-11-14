// Sign-in for the native app: Better Auth, with the session kept in the device's secure
// storage (Keychain on iOS, Keystore on Android) by the platform module.
import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { platform } from "@/platform";
import { ACCESS_HEADERS, API_ORIGIN, APP_SCHEME } from "./config";

export const authClient = createAuthClient({
  baseURL: API_ORIGIN,
  fetchOptions: { headers: ACCESS_HEADERS },
  plugins: [expoClient({ scheme: APP_SCHEME, storagePrefix: APP_SCHEME, storage: platform.storage }), emailOTPClient()],
});
