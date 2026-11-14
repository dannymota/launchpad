// Apple's own Sign in with Apple button, drawn by the system so it always matches Apple's rules.
import * as AppleAuthentication from "expo-apple-authentication";

export function AppleButton({ onPress, dark, radius }: { onPress(): void; dark: boolean; radius: number }) {
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={
        dark
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={radius}
      onPress={onPress}
      style={{ height: 48 }}
    />
  );
}
