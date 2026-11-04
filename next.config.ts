import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // cacheComponents/partialPrefetching disabled: they require an
  // incremental cache at runtime, which the OpenNext "dummy" cache cannot
  // serve — every request 500s (fixed 2026-11-03, docs/DECISIONS.md D11).
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
