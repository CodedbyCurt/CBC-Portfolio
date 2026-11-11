import Image from "next/image";
import type { Project } from "@/lib/site-config";

const blur = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZDRjYmJlIi8+PC9zdmc+";

export function BrowserPreview({ project, compact = false }: { project: Project; compact?: boolean }) {
  return <div className={`relative isolate overflow-hidden border-2 border-[#080a08] bg-paper ${compact ? "rounded-[.7rem] shadow-[0_28px_80px_rgba(0,0,0,.44),0_6px_0_#080a08] ring-1 ring-paper/15" : "rounded-md shadow-[7px_7px_0_#171714]"}`}>
    <div className="flex h-8 items-center gap-1.5 border-b-2 border-ink/90 bg-gradient-to-b from-[#f8f5ee] to-clay px-3" aria-hidden="true"><i className="size-2 rounded-full bg-signal shadow-[0_1px_1px_rgba(0,0,0,.25)]" /><i className="size-2 rounded-full bg-ink/30" /><i className="size-2 rounded-full bg-ink/30" /><span className="mx-auto h-3 w-[34%] rounded-full border border-ink/10 bg-paper/75 shadow-inner" /><span className="font-mono text-[8px] uppercase tracking-[.14em] text-ink/55">preview</span></div>
    <Image src={project.image} alt={project.imageAlt} width={project.imageWidth} height={project.imageHeight} className="h-auto w-full" placeholder="blur" blurDataURL={blur} sizes={compact ? "(prefers-reduced-motion: reduce) and (max-width: 911px) 68vw, (max-width: 688px) 90vw, 620px" : "(max-width: 768px) 90vw, 60vw"} />
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border border-white/20 bg-gradient-to-br from-white/15 via-transparent to-black/10" />
  </div>;
}

export function DevicePair({ project }: { project: Project }) {
  return <div className="relative mx-auto w-full max-w-3xl pb-10 pr-4 sm:pr-12">
    <BrowserPreview project={project} />
    <div className="absolute -bottom-1 right-0 w-[25%] min-w-24 overflow-hidden rounded-[1rem] border-2 border-ink bg-paper p-1 shadow-[5px_5px_0_#171714]">
      <div className="mb-1 h-3 rounded-full bg-ink" aria-hidden="true" />
      <Image src={project.image} alt="" width={project.imageWidth} height={project.imageHeight} className="h-auto w-full" placeholder="blur" blurDataURL={blur} sizes="20vw" />
    </div>
  </div>;
}
