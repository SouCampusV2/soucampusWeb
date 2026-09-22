"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Почти невидимое появление (minimalist §7): подъём на 12px, 600ms,
// каскад по 80ms на элемент. Без JS и при «меньше движения» — сразу видно.
export function FadeIn({ children, index = 0, className = "" }: { children: React.ReactNode; index?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Прятать только то, что ещё ниже экрана: верх страницы не мигает.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setState("hidden");
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setState("shown");
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 80}ms` }}
      className={`transition-[opacity,transform] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        state === "hidden" ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// Клавиша O → страница заказа. Не срабатывает в полях ввода и с
// модификаторами (Ctrl+O — «открыть файл» в браузере).
export function OrderShortcut() {
  const router = useRouter();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "o" || e.key === "O") router.push("/contact");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}
