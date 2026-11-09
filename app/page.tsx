// POC ONLY — demo page, rendered per request (fully dynamic, like the
// target app's routes). The frame below is request-independent and sent first;
// only <Geo /> reads the request and streams in behind <Suspense>.
import { Suspense } from "react";
import { Geo, GeoSkeleton } from "@/components/geo";

function VercelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1155 1000" className={className} aria-label="Vercel" fill="currentColor">
      <path d="m577.3 0 577.4 1000H0z" />
    </svg>
  );
}

export default function Page() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black font-sans text-white">
      <header className="relative z-10 flex items-center gap-3 border-b border-neutral-800 px-6 py-4">
        <VercelLogo className="h-5 w-5" />
        <span className="text-neutral-400">/</span>
        <span className="text-sm font-medium">geo-proxy-poc</span>
      </header>

      <Suspense fallback={<GeoSkeleton />}>
        <Geo />
      </Suspense>

      <footer className="relative z-10 border-t border-neutral-800 px-6 py-4 text-xs text-neutral-400">
        Geo headers read in <code className="font-mono">proxy.ts</code> · Rendered per request · Powered by Vercel
      </footer>
    </div>
  );
}
