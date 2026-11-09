import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is intentionally OFF to match the target app (all
  // page routes fully dynamic, ƒ). With it on, Vercel serves pages from the
  // prerendered shell, whose Vary is fixed at build time (no x-country).

  // PRODUCTION: let Vercel's CDN cache the pages (one copy per x-country,
  // via Vary). Vercel-CDN-Cache-Control has top priority for Vercel's CDN and
  // is removed before the response leaves Vercel, so browsers still get the
  // page's `Cache-Control: private, no-store`. Only use this on pages whose
  // content depends on nothing but the URL and the country.
  async headers() {
    return [
      { source: "/", headers: [{ key: "Vercel-CDN-Cache-Control", value: "max-age=60" }] },
    ];
  },
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
