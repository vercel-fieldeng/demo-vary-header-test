import { NextResponse, type NextRequest } from "next/server";
import { resolveCountry, setCountryRequestHeaders, UNKNOWN_COUNTRY } from "@/lib/country";
import { getCountryOverride, resolveDemoRegion } from "@/components/overrides";

// Blocks marked POC can be deleted; the PRODUCTION blocks are all that's needed
// to ship the x-country behavior (see README.md).
export function proxy(request: NextRequest) {
  // ── POC: demo region theme + query-string overrides ──────────────────────
  const region = resolveDemoRegion(request);
  const countryOverride = getCountryOverride(request);

  // ── PRODUCTION: resolve the country; set the page's request headers ──────
  const country = countryOverride /* POC */ ?? resolveCountry(request.headers);
  const headers = new Headers(request.headers);
  setCountryRequestHeaders(headers, country);

  // ── POC: pass geo data to the demo page as request headers ───────────────
  headers.set("x-geo-region", region);
  headers.set("x-geo-country", country === UNKNOWN_COUNTRY ? "" : country);

  // ── PRODUCTION: pass the request headers on (no response headers here) ───
  return NextResponse.next({ request: { headers } });
}

// POC scope: the single demo page. In production, widen this to every page
// route that should carry x-country (excluding static assets).
export const config = {
  matcher: "/",
};
