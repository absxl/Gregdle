import type { OpenNextConfig } from "@opennextjs/cloudflare";

/**
 * Cloudflare deployment config (docs/DECISIONS.md, D1).
 * Cache overrides are "dummy" for now — static prerendering of the dataset
 * pages works without a KV binding; switch incrementalCache to a KV-backed
 * implementation in a later milestone if ISR caching is needed.
 */
const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
  edgeExternals: ["node:crypto"],
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
};

export default config;
