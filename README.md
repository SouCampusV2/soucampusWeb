# SouCampus builds

Custom Minecraft maps, structures and worlds — built on order.

## The story

I build custom Minecraft maps and structures for clients — spawns, RPG maps, cathedrals, dragon shrines, whatever they can dream up. This repo is that business turning into a real website: a portfolio to show finished work, and eventually a shop for digital builds and subscriptions.

It's also my hands-on way of learning modern web development — going from "I know HTML/CSS and a bit of JS" to actually shipping something real, with an AI pair (Claude Code) helping me learn the syntax and architecture along the way, one feature at a time instead of all at once.

## Stack

**In use right now:**

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Motion](https://motion.dev) (`motion/react`) for animation
- Deployed on [Vercel](https://vercel.com)

**Planned, not wired up yet:**

- [Supabase](https://supabase.com) — database + auth, for a mini content admin and later the shop
- [Stripe](https://stripe.com) — payments for the digital build shop
- CI/CD via GitHub Actions
- Docker, once there's an actual reason for it

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `src/app/` — pages (Next.js App Router): home, `/portfolio`, `/portfolio/[slug]`, `/about`, `/contact`, `/shop`
- `src/components/` — landing sections and shared UI (`Button`, `ArrowCircle`, `Navbar`, `PageTransition`, ...)
- `src/lib/projects.ts` — portfolio project data
- `CLAUDE.md` — project plan and learning roadmap
- `DESIGN.md` — the design system: colors, typography, layout rules, reusable components

## Roadmap

1. ~~Working portfolio site~~ — done
2. Real content everywhere (currently placeholders: Discord invite, About me, reviews, stats, pricing)
3. Mini content admin backed by Supabase
4. Shop: catalog, cart, checkout, Stripe
5. Docker, CI/CD, tests, analytics
