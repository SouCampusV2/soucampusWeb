"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { labHref, type LabPage } from "../../_shared/pages";

const SLUG = "agency";

const LINKS: { href: string; label: string; page?: LabPage }[] = [
  { href: labHref(SLUG, "portfolio"), label: "Portfolio", page: "portfolio" },
  { href: "/marketplace", label: "Marketplace" },
  { href: labHref(SLUG, "about"), label: "About", page: "about" },
  { href: labHref(SLUG, "contact"), label: "Order a map", page: "contact" },
];

// Остров-навбар (soft-skill §5.A): стеклянная пилюля, оторванная от
// верха; гамбургер из двух линий плавно складывается в X; меню — оверлей
// на весь экран с тяжёлым стеклом, ссылки выезжают снизу по очереди.
//
// ⚠️ blur здесь законен: элемент fixed (§6 — blur только на fixed).
export function IslandNav({ page }: { page: LabPage }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-6 z-50 flex justify-center px-4">
        <div className="flex w-max items-center gap-6 rounded-full bg-white/70 py-2 pl-6 pr-2 shadow-[0_10px_40px_-15px_rgba(30,36,50,0.3)] ring-1 ring-black/5 backdrop-blur-xl">
          <Link href={labHref(SLUG, "home")} className="font-extrabold tracking-tight">SouCampus</Link>
          {/* Где я — одним словом в пилюле. Меню спрятано за гамбургером,
              и без этой подписи на странице не видно, какая она. */}
          {page !== "home" && (
            <span className="hidden text-sm capitalize text-[#5b606b] sm:inline">{page}</span>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="soft-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative grid h-10 w-10 place-items-center rounded-full bg-[#16181d]"
          >
            <span className={`absolute h-[1.5px] w-4 bg-white transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "rotate-45" : "-translate-y-[3px]"}`} />
            <span className={`absolute h-[1.5px] w-4 bg-white transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "-rotate-45" : "translate-y-[3px]"}`} />
          </button>
        </div>
      </header>

      <div
        id="soft-menu"
        className={`fixed inset-0 z-40 flex items-center justify-center bg-white/80 backdrop-blur-3xl transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        inert={!open}
      >
        <ul className="flex flex-col items-center gap-2">
          {LINKS.map((l, i) => (
            <li key={l.href} className="overflow-hidden">
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={l.page === page ? "page" : undefined}
                style={{ transitionDelay: open ? `${100 + i * 60}ms` : "0ms" }}
                className={`block text-[clamp(2.5rem,7vw,5rem)] font-extrabold tracking-[-0.04em] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
                } aria-[current=page]:text-[#5b606b]`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

// Появление при входе в экран (§5.C): подъём на 64px с размытием,
// 900ms, своя кривая. Наблюдатель отключается после первого показа.
// При «меньше движения» элемент виден сразу.
export function Reveal({
  children,
  delay = 0,
  className = "",
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ ...style, transitionDelay: `${delay}ms` }}
      className={`relative transition-[opacity,transform,filter] duration-[900ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
        shown ? "translate-y-0 opacity-100 blur-0" : "translate-y-16 opacity-0 blur-md"
      } motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:transition-none ${className}`}
    >
      {children}
    </div>
  );
}
