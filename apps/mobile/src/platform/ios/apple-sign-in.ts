// The native Sign in with Apple sheet. iOS only: App Review expects it wherever another
// provider is offered.
import * as AppleAuthentication from "expo-apple-authentication";

export async function appleSignIn(): Promise<{ token: string; nonce?: string } | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
    });
    return credential.identityToken ? { token: credential.identityToken } : null;
  } catch (error) {
    // The person closed the sheet: not an error to show.
    if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    throw error;
  }
}
