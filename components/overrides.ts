// ============================================================================
// POC ONLY — not needed in production.
// Query-string overrides for testing without real geo headers (e.g. locally):
//   ?region=eu   → regional theme (+ a sample country, see below)
//   ?country=DE  → x-country
// ============================================================================

import type { NextRequest } from "next/server";
import { toCountryCode } from "@/lib/country";
import { isRegionKey, type RegionKey } from "@/components/regions";

// Representative country per region, so `?region=` alone yields a coherent
// x-country when testing.
const SAMPLE_COUNTRY: Partial<Record<RegionKey, string>> = {
  na: "US",
  sa: "BR",
  eu: "DE",
  af: "ZA",
  as: "JP",
  oc: "AU",
  an: "AQ",
};

/** Theme region: ?region= override → x-vercel-ip-continent → "default". */
export function resolveDemoRegion(request: NextRequest): RegionKey {
  const override = request.nextUrl.searchParams.get("region")?.toLowerCase();
  const continent = request.headers.get("x-vercel-ip-continent")?.toLowerCase();
  if (isRegionKey(override)) return override;
  if (isRegionKey(continent)) return continent;
  return "default";
}

/** Country forced by ?country=, or the sample country for ?region=. */
export function getCountryOverride(request: NextRequest): string | undefined {
  const { searchParams } = request.nextUrl;
  const region = searchParams.get("region")?.toLowerCase();
  return (
    toCountryCode(searchParams.get("country")) ??
    (isRegionKey(region) ? SAMPLE_COUNTRY[region] : undefined)
  );
}
