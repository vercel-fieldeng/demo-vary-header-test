// ============================================================================
// PRODUCTION CODE
// Per-country CDN caching on Vercel: each page response carries
// `x-country: <country>` and `Vary: x-country`, and Vercel's CDN keeps one
// cached copy per country.
//
// Requires patches/next+16.4.2.patch and the `Vercel-CDN-Cache-Control` rule in
// next.config.ts.
//
// How it works (both on the REQUEST the proxy passes to the page function):
// - `x-country: <country>` — the cache key. Vercel's CDN reads Vary'd headers
//   from the request after the proxy runs, so this splits the cache per country.
// - `x-extra-vary: x-country` — the patched page function adds `x-country` to
//   Vary and copies the request's `x-country` onto the response.
//
// Don't set `x-country` as a proxy *response* header: on Vercel, a proxy
// response header with the same name as a Vary field breaks CDN caching
// (never cached, or never split per country).
// ============================================================================

export const COUNTRY_HEADER = "x-country";
export const UNKNOWN_COUNTRY = "unknown";

/**
 * The visitor's country from Vercel IP geolocation (`x-vercel-ip-country`).
 * Vercel sets this header and replaces any client-sent value, so visitors
 * can't choose their own country. Not present locally → "unknown".
 * https://vercel.com/docs/headers/request-headers#x-vercel-ip-country
 */
export function resolveCountry(headers: Headers): string {
  return toCountryCode(headers.get("x-vercel-ip-country")) ?? UNKNOWN_COUNTRY;
}

/**
 * Sets the request headers the page function needs (see top of file). Call on
 * the headers passed to `NextResponse.next({ request: { headers } })`. Uses
 * `set`, so any client-sent values for these headers are replaced.
 */
export function setCountryRequestHeaders(requestHeaders: Headers, country: string): void {
  requestHeaders.set(COUNTRY_HEADER, country);
  requestHeaders.set("x-extra-vary", COUNTRY_HEADER);
}

/** ISO 3166-1 alpha-2 (e.g. "DE"), uppercased; anything else → undefined. */
export function toCountryCode(value: string | null | undefined): string | undefined {
  const code = value?.trim().toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : undefined;
}
