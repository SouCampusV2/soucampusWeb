"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/Button";

const links = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About me" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-4 z-50 px-4">
      <header className="mx-auto max-w-6xl rounded-full border border-zinc-950/[0.06] bg-[#fbfbff]/60 backdrop-blur-xl">
        <nav className="flex items-center justify-between px-6 py-3">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            SouCampus<span className="text-orange-500">.builds</span>
          </Link>

          <ul className="hidden items-center gap-8 text-sm font-medium text-zinc-600 sm:flex">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-zinc-950"
                  data-page-transition="true"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden sm:block">
            <Button href="/contact" variant="primary" size="sm" pageTransition>
              Order now
            </Button>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-1.5 sm:hidden"
            aria-label="Toggle menu"
          >
            <motion.span
              animate={{ rotate: open ? 45 : 0, y: open ? 6 : 0 }}
              className="h-0.5 w-6 bg-zinc-900"
            />
            <motion.span
              animate={{ opacity: open ? 0 : 1 }}
              className="h-0.5 w-6 bg-zinc-900"
            />
            <motion.span
              animate={{ rotate: open ? -45 : 0, y: open ? -6 : 0 }}
              className="h-0.5 w-6 bg-zinc-900"
            />
          </button>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-zinc-200 sm:hidden"
            >
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block px-6 py-3 text-sm font-medium text-zinc-700"
                    data-page-transition="true"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </header>
    </div>
  );
}
