"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { ArrowDown } from "lucide-react";
import { siteConfig, type Project } from "@/lib/site-config";
import { BrowserPreview } from "@/components/project-visual";

function PeelCard({ project, index, total, progress }: { project: Project; index: number; total: number; progress: MotionValue<number> }) {
  const isLast = index === total - 1;
  const settleAt = index === 0 ? 0.001 : 0.48 + (index - 1) * 0.33;
  const peelStart = 0.24 + index * 0.33;
  const peelEnd = peelStart + 0.22;
  const initialOffset = `${index * 4.1}vh`;
  const initialX = index === 0 ? "0vw" : index % 2 ? "4.5vw" : "-3.5vw";
  const baseRotation = -1.8 + index * 2.2;
  const direction = index % 2 === 0 ? -1 : 1;

  const y = useTransform(progress, isLast ? [0, settleAt, 1] : [0, settleAt, peelStart, peelEnd, 1], isLast ? [initialOffset, "0vh", "0vh"] : [initialOffset, "0vh", "0vh", "116vh", "116vh"]);
  const x = useTransform(progress, isLast ? [0, settleAt, 1] : [0, settleAt, peelStart, peelEnd, 1], isLast ? [initialX, "0vw", "0vw"] : [initialX, "0vw", "0vw", `${direction * 15}vw`, `${direction * 15}vw`]);
  const rotate = useTransform(progress, isLast ? [0, settleAt, 1] : [0, settleAt, peelStart, peelEnd, 1], isLast ? [`${baseRotation}deg`, "0deg", "0deg"] : [`${baseRotation}deg`, "0deg", "0deg", `${direction * 9}deg`, `${direction * 9}deg`]);
  const scale = useTransform(progress, isLast ? [0, settleAt, 1] : [0, settleAt, peelStart, peelEnd, 1], isLast ? [1 - index * 0.045, 1, 1] : [1 - index * 0.045, 1, 1, 0.91, 0.91]);
  const opacity = useTransform(progress, isLast ? [0, settleAt, 1] : [0, peelEnd - 0.045, peelEnd, 1], isLast ? [1, 1, 1] : [1, 1, 0, 0]);
  const filter = useTransform(progress, isLast ? [0, settleAt, 1] : [0, peelStart, peelEnd, 1], isLast ? ["blur(0px)", "blur(0px)", "blur(0px)"] : ["blur(0px)", "blur(0px)", "blur(3px)", "blur(3px)"]);
  const labelOpacity = useTransform(progress, index === 0 ? [0, peelEnd - 0.045, peelEnd, 1] : [0, settleAt - 0.12, settleAt, 1], index === 0 ? [1, 1, 0, 0] : [0, 0, 1, 1]);

  return <motion.div className="absolute left-1/2 top-[16vh] w-[min(90vw,620px)] -translate-x-1/2 lg:top-[19vh] lg:w-[min(68vw,620px)]" style={{ y, x, scale, opacity, rotate, filter, transformOrigin: "50% 0%", willChange: "transform, opacity, filter", zIndex: 10 - index }}><BrowserPreview project={project} compact /><motion.div className="mt-3 flex justify-between gap-3 font-mono text-[10px] uppercase tracking-widest" style={{ opacity: labelOpacity }}><span>{project.number} / {project.trade}</span><span className="text-right">{project.name}</span></motion.div></motion.div>;
}

export function ProjectScroll() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 95, damping: 28, mass: 0.35, restDelta: 0.0005 });
  const reduced = useReducedMotion();
  return <section ref={ref} aria-label="Selected work" className="h-[360vh] bg-ink text-paper lg:h-[480vh]">
    <div className="sticky top-20 h-[calc(100vh-5rem)] overflow-hidden">
    <div className="container relative h-full"><div className="absolute left-[4vw] top-8 flex items-center gap-3 eyebrow"><span className="inline-flex size-6 items-center justify-center border border-paper/60">W</span> Three live projects</div><p className="absolute bottom-9 left-[4vw] flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.14em] text-paper/70"><ArrowDown className="size-3" /> Scroll to explore the work</p>
        {siteConfig.projects.map((project, index) => reduced ? <div key={project.name} className="absolute left-1/2 top-[19vh] w-[min(68vw,620px)] -translate-x-1/2" style={{ transform: `translate(calc(-50% + ${index === 0 ? 0 : index % 2 ? 64 : -48}px), ${index * 36}px) rotate(${-1.8 + index * 2.2}deg)`, zIndex: 10 - index }}><BrowserPreview project={project} compact /></div> : <PeelCard key={project.name} project={project} index={index} total={siteConfig.projects.length} progress={smoothProgress} />)}
      </div>
    </div>
  </section>;
}
