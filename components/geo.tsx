// ============================================================================
// POC ONLY — geo-specific part of the demo page. Not needed in production.
// The only request-dependent UI; the rest of app/page.tsx is a fixed frame.
// ============================================================================

import { headers } from "next/headers";
import { REGIONS, isRegionKey } from "@/components/regions";

// Rendered per request: reads the geo headers forwarded by proxy.ts.
// Returns the region glow plus <main>; the glow must stay a sibling of <main>
// (not a child) so it paints behind the text.
export async function Geo() {
  const h = await headers();
  const raw = h.get("x-geo-region");
  const key = isRegionKey(raw) ? raw : "default";
  const country = h.get("x-geo-country") || "—";
  const r = REGIONS[key];

  return (
    <>
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-radial ${r.glow} blur-3xl`}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-24">
        <div className="mb-4 flex items-center gap-3">
          <p className={`font-mono text-sm uppercase tracking-widest ${r.accent}`}>{r.name}</p>
          <span className={`rounded-full border px-3 py-1 font-mono text-xs ${r.pill}`}>
            region: {key}
          </span>
        </div>
        <h1 className="text-5xl font-semibold tracking-tighter sm:text-7xl">{r.greeting}</h1>
        <p className="mt-6 max-w-xl text-lg text-neutral-400">{r.tagline}</p>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-neutral-800 bg-neutral-800 sm:grid-cols-3">
          {[
            ["Continent", key.toUpperCase()],
            ["Country", country],
            ["Nearby regions", r.edge],
          ].map(([label, value]) => (
            <div key={label} className="bg-black p-5">
              <p className="text-xs text-neutral-400">{label}</p>
              <p className="mt-1 font-mono text-sm">{value}</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

// Fallback for <Geo />, part of the static shell. Mirrors its layout.
export function GeoSkeleton() {
  return (
    <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-24">
      <div className="mb-4 h-7 w-56 animate-pulse rounded bg-neutral-800" />
      <div className="h-16 w-3/4 animate-pulse rounded bg-neutral-800" />
      <div className="mt-6 h-5 w-1/2 animate-pulse rounded bg-neutral-900" />
      <div className="mt-12 h-[4.5rem] animate-pulse rounded-xl border border-neutral-800 bg-neutral-950" />
    </main>
  );
}
