// Metro, set up for this repo: the app lives in apps/mobile with its own node_modules and
// imports two packages from the repo root (see the paths in tsconfig.json).
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const root = path.resolve(__dirname, "../..");
const config = getDefaultConfig(__dirname);

// The only code outside this folder the app may bundle.
config.watchFolders = [
  path.join(root, "packages/shared"),
  path.join(root, "packages/theme"),
  path.join(root, "product"),
];
// The shared packages' own imports (zod, the API client) resolve from this app's
// node_modules. The repo root's node_modules is not watched, so Metro never bundles the web
// app's versions of React and friends.
config.resolver.nodeModulesPaths = [path.join(__dirname, "node_modules")];

module.exports = config;
