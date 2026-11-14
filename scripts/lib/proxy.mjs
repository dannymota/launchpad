// Node's own fetch ignores HTTPS_PROXY unless it is told to honour it when the process
// starts (NODE_USE_ENV_PROXY=1, Node 22.21 and later). Behind a proxy, such as a cloud
// session or an office network, every call to Cloudflare would otherwise fail with
// "fetch failed". wrangler handles the proxy itself; this is for the scripts' own calls.
import { spawnSync } from "node:child_process";

/** True when the environment names a proxy and Node has not been told to use it. */
export function needsProxyRerun(env = process.env) {
  return Boolean(env.HTTPS_PROXY || env.https_proxy) && !env.NODE_USE_ENV_PROXY;
}

/** Behind a proxy, runs this same command again with the proxy honoured, and exits with its result. */
export function throughProxy() {
  if (!needsProxyRerun()) return;
  const again = spawnSync(process.execPath, process.argv.slice(1), {
    stdio: "inherit",
    env: { ...process.env, NODE_USE_ENV_PROXY: "1" },
  });
  process.exit(again.status ?? 1);
}
