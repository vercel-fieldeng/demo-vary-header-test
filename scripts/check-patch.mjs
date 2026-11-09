// Fails the build if the installed Next.js isn't patched. Without the patch,
// pages lack `Vary: x-country` while the Vercel-CDN-Cache-Control rule still
// caches them — so one country's page would be served to everyone.
// Runs automatically as `prebuild`.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const MARKERS = [
  "const extraVary = String(req.headers['x-extra-vary']",
  "for (const name of extraVary){",
];
const nextDir = path.dirname(createRequire(import.meta.url).resolve("next/package.json"));
const files = [
  "dist/build/templates/app-page-runtime.js",
  "dist/esm/build/templates/app-page-runtime.js",
];
for (const rel of files) {
  const src = fs.readFileSync(path.join(nextDir, rel), "utf8");
  if (!MARKERS.every((m) => src.includes(m))) {
    console.error(
      `check-patch: ${rel} is not patched.\n` +
      "Run `yarn install` (postinstall applies patches/), or redeploy without the build cache.",
    );
    process.exit(1);
  }
}
console.log("check-patch: next is patched");
