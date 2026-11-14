// Neither iOS nor Android: the web build, used to preview shared screens in a browser.
// Metro picks index.ios.ts or index.android.ts on a device.
import type { PlatformApi } from "./types";

export type { PlatformApi, Provider } from "./types";

const read = (key: string) => globalThis.localStorage?.getItem(key) ?? null;
const write = (key: string, value: string) => globalThis.localStorage?.setItem(key, value);

export const platform: PlatformApi = {
  storage: {
    getItem: read,
    getItemAsync: async (key) => read(key),
    setItem: write,
    setItemAsync: async (key, value) => write(key, value),
  },
  providerOrder: ["google", "apple"],
  appleSignIn: null,
  AppleButton: null,
  haptic: () => {},
};
