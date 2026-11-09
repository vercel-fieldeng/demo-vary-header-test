// ============================================================================
// POC ONLY — demo themes for the regional landing page. Not needed in production.
// ============================================================================

// Region variants keyed by the value of Vercel's `x-vercel-ip-continent` header.
// https://vercel.com/docs/headers/request-headers#x-vercel-ip-continent

export type RegionKey = "na" | "sa" | "eu" | "af" | "as" | "oc" | "an" | "default";

export type Region = {
  name: string;
  greeting: string;
  tagline: string;
  edge: string; // Example Vercel regions nearby, for flavour
  glow: string;
  accent: string;
  pill: string;
};

export const REGIONS: Record<RegionKey, Region> = {
  na: {
    name: "North America",
    greeting: "Hey there, North America.",
    tagline: "Served from the edge, a few milliseconds from you.",
    edge: "iad1 · sfo1 · cle1 · pdx1",
    glow: "from-blue-600/40 via-cyan-500/20 to-transparent",
    accent: "text-cyan-400",
    pill: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  },
  sa: {
    name: "South America",
    greeting: "Olá, South America.",
    tagline: "Fast everywhere, including right where you are.",
    edge: "gru1",
    glow: "from-emerald-600/40 via-lime-400/20 to-transparent",
    accent: "text-emerald-400",
    pill: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  },
  eu: {
    name: "Europe",
    greeting: "Hallo, Europe.",
    tagline: "Personalized at the edge, without leaving the continent.",
    edge: "fra1 · lhr1 · cdg1 · arn1 · dub1",
    glow: "from-violet-600/40 via-fuchsia-500/20 to-transparent",
    accent: "text-violet-400",
    pill: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  },
  af: {
    name: "Africa",
    greeting: "Sawubona, Africa.",
    tagline: "Your request was routed to the closest edge.",
    edge: "cpt1",
    glow: "from-amber-500/40 via-orange-500/20 to-transparent",
    accent: "text-amber-400",
    pill: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  as: {
    name: "Asia",
    greeting: "こんにちは, Asia.",
    tagline: "Low latency from Tokyo to Mumbai.",
    edge: "hnd1 · icn1 · sin1 · bom1 · hkg1 · kix1",
    glow: "from-rose-600/40 via-red-500/20 to-transparent",
    accent: "text-rose-400",
    pill: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  },
  oc: {
    name: "Oceania",
    greeting: "G'day, Oceania.",
    tagline: "The edge comes to you, wherever you are in the Pacific.",
    edge: "syd1",
    glow: "from-sky-500/40 via-teal-400/20 to-transparent",
    accent: "text-sky-400",
    pill: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  },
  an: {
    name: "Antarctica",
    greeting: "Hello, Antarctica?",
    tagline: "We're impressed you have Wi-Fi.",
    edge: "—",
    glow: "from-slate-400/30 via-blue-200/20 to-transparent",
    accent: "text-slate-300",
    pill: "border-slate-400/40 bg-slate-400/10 text-slate-200",
  },
  default: {
    name: "Unknown",
    greeting: "Hello, world.",
    tagline: "No geo header detected. Deploy to Vercel, or try ?region=eu.",
    edge: "—",
    glow: "from-neutral-500/30 via-neutral-700/20 to-transparent",
    accent: "text-neutral-400",
    pill: "border-neutral-500/40 bg-neutral-500/10 text-neutral-300",
  },
};

export const REGION_KEYS = Object.keys(REGIONS) as RegionKey[];

export function isRegionKey(value: string | null | undefined): value is RegionKey {
  return !!value && value in REGIONS;
}
