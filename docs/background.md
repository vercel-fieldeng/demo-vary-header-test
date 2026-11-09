# Background

Details behind the [README](../README.md): why the design looks the way it does,
the tests behind it, what the patch changes, and how to adapt it.

## Why the proxy can't set the headers itself

On Vercel, `proxy.ts` runs as its own function (`_middleware.func` in the build
output). Pages run in a separate function, where Next.js starts in minimal mode and
never runs the proxy itself. Vercel then merges the response headers from both.

We measured the merge rules with a proxy and a route handler that set the same
headers:

| Header | Proxy sets | Page function sets | Result on Vercel |
|---|---|---|---|
| `X-Test` | `proxy` | `function` | `function` |
| `Vary` | `from-proxy` | `from-function` | `from-function` |
| `Vary` | `from-proxy` | (nothing) | `from-proxy` |
| A request header | `x-test-req` | reads it | received |

Next.js always sets `Vary` on App Router pages, so a proxy's `Vary` is always
replaced. Request headers do get through, which is what this design relies on.

Upstream [vercel/next.js#98104](https://github.com/vercel/next.js/pull/98104)
(unmerged) makes Next.js merge a `Vary` it finds on the response. On Vercel there's
nothing to find, because the proxy's headers aren't on the page function's
response. With only that change, the deployed `vary` still lacks `x-country`.

## How CDN caching was made to work

All tested on Vercel preview deployments, with `Vary: x-country` unchanged.

**What didn't work:**

| Attempt | Result |
|---|---|
| `export const revalidate = 60` | The page stays `ƒ` (it reads request headers) and sends `private, no-store` |
| `Vercel-CDN-Cache-Control` set by the proxy | Never cached (always `MISS`) |
| `Cache-Control: s-maxage` from `next.config.ts` | Replaced by the page function's `private, no-store` |

**What works:** `Vercel-CDN-Cache-Control` from `next.config.ts`. It has top
priority for Vercel's CDN, even over the page function's `private, no-store`.

**The cache key.** The CDN reads the `Vary`'d request headers **after** the proxy
runs, so a `x-country` value the proxy sets on the request splits the cache.

**The response header trap.** Setting `x-country` as a proxy *response* header
breaks caching when `x-country` is also in `Vary`:

| Proxy sets `x-country` on | Result |
|---|---|
| the request only | Caches and splits per country |
| the response only | Never cached |
| both | Cached, but keyed on the response value, so never split |

A `next.config.ts` rule can't copy the value into the response either: it's
evaluated before the proxy sets the request header. So the patched page function
copies it: every header listed in `x-extra-vary` is added to `Vary` and copied
from the request onto the response. A function-set `x-country` response header
caches and splits correctly.

**RSC requests** are cached separately from HTML. Vercel routes them to their own
path (`/index.rsc`), independent of `Vary`.

We also confirmed the deployed page function runs the patched Next.js from the
project's own `node_modules`. Vercel doesn't substitute its own copy.

## What the patch changes

The patch edits 12 compiled files in `node_modules/next/dist`:

| Files | Change |
|---|---|
| `build/templates/app-page-runtime.js` (CJS and ESM) | Reads `x-extra-vary`, adds the names to `Vary`, and copies those request headers onto the response |
| `server/route-modules/app-page/module.js` (CJS and ESM) | `getVaryHeader()` merges the extra names into Next's own `Vary`, without duplicates |
| `compiled/next-server/app-page*.runtime.{dev,prod}.js` (8 bundles) | The same `Vary` merge, for the prebuilt runtime |

`x-extra-vary` accepts at most 5 header names, and only well-formed ones. It
refuses names that are dangerous to copy onto a (possibly cached) response or
meaningless in `Vary`: `set-cookie`, `cookie`, `authorization`, `cache-control`,
`cdn-cache-control`, `vercel-cdn-cache-control`, `vary`, `location`, `refresh`,
`link`, `content-*`, `access-control-*`, `cross-origin-*`,
`strict-transport-security`, `x-vercel-*`, `x-forwarded-*`, and others (see
`SENSITIVE` in the generator). Copied values must be printable and at most 256
characters.

The patch file is about 1.5 MB because the prebuilt bundles are minified onto
single lines. Review [`scripts/apply-vary-patch.mjs`](../scripts/apply-vary-patch.mjs)
instead: it makes the same changes and comments each one.

## Security notes

**Who sets `x-extra-vary`.** Only your proxy should, on the request it passes to
the page. Browsers never send it, and it never appears in responses.

**Why one header.** Earlier versions used a second request header to list which
headers to copy onto the response. On Vercel, a header that's in `Vary` must come
from the page function (a proxy response header with the same name breaks
caching), so "headers in `Vary`" and "headers to copy" are the same list. One
header removes the duplication.

**The page can't tell which request headers the proxy added.**
`NextResponse.next({ request: { headers } })` forwards *every* header in the
object, including the visitor's `cookie` and `authorization`. So the page can't
simply echo "what the proxy set"; it has to be told which names.

**Forging on pages the proxy doesn't cover.** On pages the proxy covers, `set`
replaces any client-sent `x-extra-vary` and `x-country`. On a page it doesn't
cover, a visitor can send their own `x-extra-vary` plus a matching header:

- Refused names (above) are never copied or added to `Vary`, so a visitor can't
  inject caching, redirect, CORS, cookie, or security headers.
- Allowed custom names can be added to `Vary` (more cache copies and misses) and
  echoed back to that visitor. Other visitors aren't affected: the extra header
  is in `Vary`, so a shared cache keeps it as a separate copy.
- The refusal list is a blocklist. A future header that's dangerous to echo
  wouldn't be on it, so the main defense is a proxy matcher that covers every
  page.

**Fail closed.** `scripts/check-patch.mjs` runs as `prebuild` and fails the build
if the patch isn't applied. Without it, the caching rule would still cache pages
that lack `Vary: x-country`.

## Regenerating the patch

For a new Next.js version, or after editing the script:

```bash
rm patches/next+*.patch
rm -rf node_modules/next
yarn install --ignore-scripts --check-files
node scripts/apply-vary-patch.mjs node_modules/next
yarn patch-package next
```

`--check-files` makes Yarn reinstall the removed `next`. Without it, Yarn reports
"Already up-to-date" and the script finds already-patched code.

The script accepts only Next.js 16.4.2, and each edit must match exactly once, so it
fails instead of patching the wrong code. For a new version, update the version
check and the matched strings. For 16.4.2 it reproduces the committed patch
exactly.

After you deploy a changed patch, redeploy once without Vercel's build cache. The
cache holds `next` with the old patch applied, and patch-package can't apply the
new one on top. This also happens when preview deployments use different patch
versions.

## Other Next.js versions and package managers

- **Other Next.js versions:** regenerate the patch (above).
- **pnpm or Yarn 2+:** don't hand-port the patch file. Run `pnpm patch next@16.4.2`
  (or `yarn patch next`), run the script on the folder it prints, then
  `pnpm patch-commit` (or `yarn patch-commit`). Not tested in this repo.
- **Monorepos:** set up patch-package in the workspace where `next` is installed.

## Removing the patch later

PR #98104 alone doesn't fix this on Vercel. Remove the patch only when a Next.js
release lets a page add `Vary` fields and response headers from the proxy, and
re-run the check in the README.
