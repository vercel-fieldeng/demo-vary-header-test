// Applies the Vary fix to a CLEAN (unpatched) next@16.4.2 in node_modules.
// After running it, `yarn patch-package next` writes patches/next+16.4.2.patch.
//
// Goal: let App Router page responses on Vercel carry extra Vary fields.
// On Vercel the proxy runs as a separate function, and a page function's Vary
// replaces the proxy's. So the proxy sends the field names as the
// `x-extra-vary` REQUEST header, and the page function merges them into the
// Vary it sets. (Merge logic adapted from vercel/next.js#98104.)
//
// What it changes (12 files):
//  1–2) dist/(esm/)server/route-modules/app-page/module.js
//       getVaryHeader(..., extraVaryFields) merges extra fields into Next's
//       own Vary (case-insensitive, no duplicates, Next's fields kept).
//  3–4) dist/(esm/)build/templates/app-page-runtime.js
//       The call site reads `x-extra-vary` from the request. Header-name tokens
//       only, max 5, never cookie/authorization.
//       It also copies the request headers named in `x-extra-response-headers`
//       onto the response. A proxy can't set these itself on Vercel without
//       breaking CDN caching when the same header name is in Vary.
//       Max 5 names, safe values only, never sensitive/hop-by-hop headers.
//  5–12) dist/compiled/next-server/app-page*.runtime.{dev,prod}.js
//       Prebuilt runtime bundles: getVaryHeader wrapped with the same merge.
//
// Every replacement must match exactly once, so on any other Next.js version
// the script stops with an error instead of patching the wrong code. Use it as
// the map of what to change when porting to a new version.
//
// Usage: node scripts/apply-vary-patch.mjs node_modules/next
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2];
if (!root) throw new Error("usage: node scripts/apply-vary-patch.mjs <path-to-node_modules/next>");
const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
if (version !== "16.4.2") throw new Error(`written for next@16.4.2, found ${version}`);
const d = (p) => path.join(root, "dist", p);

function replaceOnce(file, from, to) {
  const src = fs.readFileSync(file, "utf8");
  const count = typeof from === "string"
    ? src.split(from).length - 1
    : (src.match(new RegExp(from.source, "g")) || []).length;
  if (count !== 1) throw new Error(`${file}: expected 1 match, found ${count} (already patched, or a different Next.js version?)`);
  fs.writeFileSync(file, src.replace(from, to));
}

// mergeVaryHeader() from the PR, as plain JS.
const MERGE_FN = `
/**
 * Merges extra field names (from the \`x-extra-vary\` request header, set by the
 * app's proxy) into the \`Vary\` header the router needs, skipping duplicates.
 * Patched in via patch-package; merge logic adapted from vercel/next.js#98104.
 */ function mergeVaryHeader(existing, added) {
    const fields = [];
    const seen = new Set();
    const collect = (value)=>{
        for (const field of value.split(',')){
            const trimmed = field.trim();
            if (!trimmed) continue;
            const normalized = trimmed.toLowerCase();
            if (seen.has(normalized)) continue;
            seen.add(normalized);
            fields.push(trimmed);
        }
    };
    if (typeof existing === 'string') {
        collect(existing);
    } else if (Array.isArray(existing)) {
        for (const value of existing)collect(value);
    }
    collect(added);
    return fields.join(', ');
}
`;

// 1–2) Route module (CJS + ESM): getVaryHeader merges extra fields.
for (const [file, hdr] of [
  [d("server/route-modules/app-page/module.js"), "_approuterheaders."],
  [d("esm/server/route-modules/app-page/module.js"), ""],
]) {
  replaceOnce(file,
    "getVaryHeader(resolvedPathname, interceptionRoutePatterns) {",
    "getVaryHeader(resolvedPathname, interceptionRoutePatterns, extraVaryFields) {");
  replaceOnce(file,
    `            return \`\${baseVaryHeader}, \${${hdr}NEXT_URL}\`;`,
    `            varyHeader = \`\${baseVaryHeader}, \${${hdr}NEXT_URL}\`;`);
  replaceOnce(file,
    "            return baseVaryHeader;\n        }\n    }",
    "            varyHeader = baseVaryHeader;\n        }\n        return mergeVaryHeader(extraVaryFields, varyHeader);\n    }");
  replaceOnce(file,
    `${hdr}NEXT_ROUTER_SEGMENT_PREFETCH_HEADER}\`;\n        if (this.pathCouldBeIntercepted`,
    `${hdr}NEXT_ROUTER_SEGMENT_PREFETCH_HEADER}\`;\n        let varyHeader;\n        if (this.pathCouldBeIntercepted`);
  replaceOnce(file, "\nconst vendored = {", `${MERGE_FN}const vendored = {`);
}

// 3–4) Page template (CJS + ESM): pass the x-extra-vary request header fields.
const CALL_SITE_OLD =
  "            const varyHeader = routeModule.getVaryHeader(resolvedPathname, interceptionRoutePatterns);\n";
const CALL_SITE_NEW = `            // Patched (patch-package): extra Vary fields from the \`x-extra-vary\`
            // request header. On Vercel the proxy runs as a separate function and its
            // response Vary is replaced by this function's Vary, so the proxy sends
            // the field names as a request header instead.
            // Only header-name tokens, max 5, never cookie/authorization.
            const extraVary = String(req.headers['x-extra-vary'] ?? '').split(',').map((field)=>field.trim()).filter((field)=>/^[A-Za-z0-9-]+$/.test(field) && !/^(cookie|authorization)$/i.test(field)).slice(0, 5);
            const varyHeader = routeModule.getVaryHeader(resolvedPathname, interceptionRoutePatterns, extraVary);
`;
const SET_VARY_OLD = "            res.setHeader('Vary', varyHeader);\n";
const SET_VARY_NEW = `            res.setHeader('Vary', varyHeader);
            // Patched (patch-package): copy the request headers named in
            // \`x-extra-response-headers\` onto the response. On Vercel a proxy-set
            // response header that is also named in Vary breaks CDN caching, so the
            // proxy puts the value on the request and the page function sends it.
            for (const name of String(req.headers['x-extra-response-headers'] ?? '').split(',').map((field)=>field.trim().toLowerCase()).filter((field)=>/^[a-z0-9-]+$/.test(field) && !/^(set-cookie|cookie|authorization|cache-control|vary|location|connection|transfer-encoding|content-.*|x-middleware-.*|x-vercel-.*)$/.test(field)).slice(0, 5)){
                const value = req.headers[name];
                if (typeof value === 'string' && /^[\x20-\x7e]{1,256}$/.test(value)) res.setHeader(name, value);
            }
`;
for (const file of [d("build/templates/app-page-runtime.js"), d("esm/build/templates/app-page-runtime.js")]) {
  replaceOnce(file, CALL_SITE_OLD, CALL_SITE_NEW);
  replaceOnce(file, SET_VARY_OLD, SET_VARY_NEW);
}

// 5–12) Prebuilt runtime bundles (dev + minified prod): rename the original
// method and wrap it with the same merge. Locals only — no bundle-scope names.
const bundleDir = d("compiled/next-server");
const bundles = fs.readdirSync(bundleDir).filter((f) => /^app-page.*\.runtime\.(dev|prod)\.js$/.test(f));
if (bundles.length !== 8) throw new Error(`expected 8 app-page runtime bundles, found ${bundles.length}`);
for (const f of bundles) {
  replaceOnce(path.join(bundleDir, f), /getVaryHeader\(([A-Za-z_$]+),([A-Za-z_$]+)\)\{/, (_m, a, b) =>
    `getVaryHeader(${a},${b},__extraVary){/* patched: extra Vary fields (x-extra-vary) */` +
    `const __fields=[],__seen=new Set,__collect=__v=>{for(const __f of __v.split(",")){const __t=__f.trim();if(!__t)continue;const __n=__t.toLowerCase();if(__seen.has(__n))continue;__seen.add(__n);__fields.push(__t)}};` +
    `if(typeof __extraVary==="string")__collect(__extraVary);else if(Array.isArray(__extraVary))for(const __v of __extraVary)__collect(__v);` +
    `__collect(this.__nextBaseVaryHeader(${a},${b}));return __fields.join(", ")}` +
    `__nextBaseVaryHeader(${a},${b}){`);
}

console.log(`patched next@${version}: 4 source files + ${bundles.length} runtime bundles`);
