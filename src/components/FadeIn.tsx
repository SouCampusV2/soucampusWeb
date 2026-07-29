"use client";

import { useEffect, useRef, useState } from "react";

// Replaces `motion.div`'s `initial={{opacity:0,y}} whileInView={{opacity:1,y:0}}
// viewport={{once:true}}` pattern with plain CSS transitions driven by a
// single IntersectionObserver — the fade only ever needs a one-shot "has this
// scrolled into view yet" boolean, which doesn't need Motion's animation
// engine at all. Removing `motion/react` from components that only did this
// shrinks their client JS (see CLAUDE.md perf notes, 2026-07-27 audit).
export function FadeIn({
  children,
  delay = 0,
  y = 16,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -100px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transform: visible ? "none" : `translateY(${y}px)`,
      }}
      className={`opacity-0 transition-[opacity,transform] duration-500 ease-out ${
        visible ? "opacity-100" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
