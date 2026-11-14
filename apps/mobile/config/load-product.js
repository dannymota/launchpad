// Reads product/product.config.ts for app.config.ts. Expo evaluates the app config in plain
// Node, which cannot import TypeScript, so the product config is bundled in memory first.
// Nothing is written to disk and no value is copied by hand.
const path = require("node:path");
const { buildSync } = require("esbuild");

function loadProduct() {
  const entry = path.resolve(__dirname, "../../../product/product.config.ts");
  const shared = path.resolve(__dirname, "../../../packages/shared/src");
  const { outputFiles } = buildSync({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "cjs",
    platform: "node",
    logLevel: "silent",
    alias: { "@app/shared/product": path.join(shared, "product/index.ts") },
  });
  const bundled = { exports: {} };
  new Function("module", "exports", outputFiles[0].text)(bundled, bundled.exports);
  return bundled.exports.default;
}

module.exports = { loadProduct };
