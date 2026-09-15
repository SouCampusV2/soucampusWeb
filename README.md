# SouCampus builds - https://soucampus.online/

Custom Minecraft maps, structures and worlds — built on order.

## The story

I build custom Minecraft maps and structures for clients — spawns, RPG maps, cathedrals, dragon shrines, whatever they can dream up. This repo is that business turning into a real website: a portfolio to show finished work, and a shop for digital builds.

It's also my hands-on way of learning modern web development — going from "I know HTML/CSS and a bit of JS" to actually shipping something real, with an AI pair (Claude Code) helping me learn the syntax and architecture along the way, one feature at a time instead of all at once.

### What the shop is right now, and why

**Version one sells my own maps and nobody else's.** The marketplace was always meant to be a marketplace — other builders publishing their work, the site taking a cut. That plan has not changed. What changed is the order.

Building the creator side to a state I'd be willing to hand strangers takes far more than the upload form: malware scanning on files that go out to buyers, upload quotas, rate limits, payouts, a moderation load I'd have to actually carry, and the legal side of paying people. All of that is work that earns nothing until somebody other than me is using it — and nobody will be, because a marketplace with no traffic attracts no sellers.

So the order is reversed. Sell my own maps first, get real visitors, real search rankings and real revenue, and open the doors to other creators once there's something worth walking into.

**The creator features are not deleted — they're switched off.** Roughly half of that work is already written and, in places, running: creator profiles, self-serve uploads, the moderation queue, applications with a review flow, status revocation that pulls a person's maps off the storefront. It sits behind `CREATOR_SIGNUPS_OPEN` in `src/lib/flags.ts` and, more importantly, behind a database policy — the application form writes straight from the browser, so hiding the form would have hidden a button, not closed a door. Turning it back on is three steps, listed in that file, and the first hard requirement is malware scanning.

Everything built from here is built so that switch can be flipped.

## Stack

**In use right now:**

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Motion](https://motion.dev) (`motion/react`) for animation
- [Supabase](https://supabase.com) (Postgres + Auth + Storage) — all site content lives here: projects, reviews, stats, products, orders, user profiles, plus a first-party visitor counter. Email+password and Google sign-in both gate the shop (purchase requires an account); avatars live in a public Storage bucket. A second project mirrors the schema for local/preview work, so migrations and payment testing never touch production data
- [Stripe](https://stripe.com) — Checkout for the digital build shop (`/marketplace`, `/cart`), webhook-verified, signed downloads from a private Storage bucket
- [Tiptap](https://tiptap.dev) — the rich-text editor map descriptions are written in (images and tables inline, not a bare textarea)
- [sanitize-html](https://github.com/apostrophecms/sanitize-html) — descriptions are author-written HTML, so they go through an explicit tag allowlist before they reach a visitor's browser. It parses the markup itself; DOMPurify (used until 2026-08-08) needs a browser DOM, and the jsdom stand-in it falls back to on the server does not load on Vercel
- [Vitest](https://vitest.dev) — 234 unit tests across 22 files, covering the pure logic (pricing formula, DB-row mapping, cookie signing, path allowlist, rejection cooldowns, Stripe session → order mapping)
- [Vercel Analytics](https://vercel.com/analytics) — traffic/page views
- Deployed on [Vercel](https://vercel.com) at [soucampus.online](https://soucampus.online) — `master` auto-deploys to production on every push, `dev` gets its own Preview URL
- CI via GitHub Actions — lint + tests + build on every push/PR to `master` and `dev`
- A weekly Claude Code cloud routine — runs the `design-check` and `structure-check` skills against the repo and drops a report in `reports/`

**Planned, not wired up yet:**

- 🟢 ~~Rate limits on our own API routes~~ — done 2026-08-23; what remains of login and email hardening lives in the Supabase dashboard, not in code
- 🔴 Two-factor auth (TOTP) on the owner account, backup codes included — being locked out of your own admin is the failure mode to design for first
- 🔴 Malware scanning for uploaded files — signatures are checked, contents aren't, and those files go to buyers. **Blocks letting other creators in.** No longer blocked itself: since 2026-09-11 a map file is checked by a handler of ours right after it lands in storage, and that is where a scanner goes
- 🔴 Upload quotas and subscriptions
- 🟡 A full content admin — the owner-facing screens exist (`/admin` overview with a sales chart, the moderation queue, the whole catalog, comments, creator applications, announcements), but portfolio, reviews and stats are still edited through the Supabase Table Editor on purpose
- 🔴 Docker, once there's an actual reason for it

**Built, then deliberately switched off** (see "What the shop is right now"): creator applications and approvals, self-serve uploads by anyone but the owner, status revocation. The code stays; the door is shut in the database, not in the UI.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Day-to-day work happens on the `dev` branch (Vercel gives it its own Preview URL); `master` is production and auto-deploys on push.

## Project structure

- `src/app/(site)/` — public pages (Next.js App Router): home, `/portfolio`, `/portfolio/[slug]`, `/reviews/[slug]`, `/about`, `/contact`, `/support`, `/marketplace`, `/marketplace/[slug]`, `/marketplace/success`, `/cart`, `/@username` (a person's public profile — the file lives at `/u/[username]`; a folder starting with `@` is a parallel-route slot in the App Router, so the pretty address comes from a rewrite), `/settings`, `/purchases`, `/resources` (a creator's own maps, including ones awaiting review), `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/welcome` (pick a username after a first Google sign-in — Google does not supply one), `/terms`, `/privacy`, `/wiki` and `/wiki/[slug]` (nineteen help articles kept as data rather than page files, so adding one is adding an object — the table of contents, the neighbours and the sitemap pick it up on their own), `/updates` and `/updates/[slug]` (What's new — posts about what changed on the site, kept as data the same way, in `src/lib/updates.ts`). The `(site)` group exists so these share a layout the future admin will not inherit
- `src/app/admin/` — owner-only area, deliberately outside the `(site)` group so it inherits no navbar, pricing block or footer: `/admin` (sales overview), `/admin/moderation` (review queue), `/admin/products` (the whole catalog — search, filters, edit, hide or delete at any time) and `/admin/products/[slug]/edit` (the map edit form, moved out of the creator cabinet on 2026-09-06 for the same reason — the cabinet is hidden while creator signups are frozen; the old address still redirects, because it is written into notifications about rejected maps that have already been sent) and `/admin/products/new` (the map upload form; it moved here from `/creator/upload` on 2026-08-28, after the profile redirect `/creator/:username` silently swallowed `upload` and left the form unreachable for a week — the old address still redirects, because it is written into notifications already sent), `/admin/applications` (creator applications), `/admin/comments` (every comment on the site, with a link to its map and a remove button), `/admin/announce` (broadcast a notification)
- `src/app/not-found.tsx` — the only 404 on the site: a giant clickable 404 and one line, no navbar and no footer. ⚠️ There is deliberately **no** `not-found.tsx` inside `(site)`: while one existed, a `notFound()` from a page in that group rendered inside the group's layout, and the navbar could not be removed from it. Adding one back silently restores the navbar for both cases
- `src/app/api/view/` — the visitor-counter endpoint
- `src/app/api/admin/moderation/`, `src/app/api/admin/comments/`, `src/app/api/creator/cleanup-storage/` — approve/reject a submission, and collect Storage objects nothing references any more. Both run under the service key on the server; the cleanup one accepts no path from the browser and works out what's in use from the database
- `src/app/api/checkout/`, `src/app/api/stripe/webhook/` — Stripe Checkout session creation and the payment webhook (signature-verified, records orders atomically via a Postgres function)
- `src/components/` — landing sections and shared UI (`Button`, `ArrowCircle`, `BackLink`, `Lightbox`, `PageGlow`, `Navbar`, `PageTransition`, ...). The navbar has two modes — portfolio and shop — but one account menu between them: `AccountMenu`/`AccountLinks` are defined once and called from both, after the shop-only version left `/`, `/about` and `/portfolio` with no way into an account at all. Anything used in more than one place lives here as a single component on purpose: the recurring bug in this repo has been the same element quietly existing in five or seven hand-made copies
- `vercel.json` — pins serverless functions to Frankfurt, next to the Supabase project. Kept in git rather than set in the dashboard so the reason travels with the code (see `docs/CHANGELOG.md`, 2026-08-08)
- `src/lib/` — data access and pure logic: Supabase clients, `projects`/`reviews`/`stats` (each with a `rowTo*` mapper that keeps DB column names out of the components), the pricing formula, cookie signing, and small shared behaviours such as `useDismiss` (close a popover on outside pointerdown and Escape — captured, not bubbled, so a `stopPropagation` elsewhere on the page cannot silently disable it; Escape walks a shared stack so a dropdown inside a popup closes first and the popup second, while outside-clicks deliberately stay per-component, since containment already answers that question better)
- `supabase/` — `migrations/` (the schema, in git so it is reproducible rather than living only in the cloud) and `seed.sql` (the one-off content transfer, kept as a record). There is no Supabase CLI here: migrations are run by hand in the SQL editor, so **each file ends by writing its own name into `ops.applied_migrations`** — asking a database what it has run beats trusting a list, which drifted and lied once already
- `scripts/check-views.mjs` — manual integration pass over the running view counter (`npm run check:views`); not part of `npm test`, it drives real HTTP and cleans up after itself
- `scripts/check-rate-limits.mjs` — manual pass over the rate limiter (`npm run check:limits`, add `--prod` for production); like the one above it stays out of `npm test`, because what it checks is live database behaviour: that `consume_rate_limit` refuses a stranger (Postgres grants execute to PUBLIC by default, so the `revoke` in the migration is the only thing standing between that function and the open internet), that the window really slides, and that separate actions and people keep separate counts
- `scripts/check-guards.mjs` — manual pass over what a signed-in person must **not** be able to write (`npm run check:guards`, add `--prod` for production): the profile fields that grant rights, the username cooldown, the six profile columns the browser is allowed and nothing else, and every map write that now goes only through our own handlers. It checks what lies in the database after each attempt, not whether the request errored — and a column it cannot read counts as a failure, not a pass
- `scripts/clear-product-storage.mjs` — empties the `product-files` and `product-images` buckets (`npm run clear:storage`), the companion to `supabase/cleanup_products_2026-08-16.sql`. Storage cannot be cleared from SQL: Supabase blocks `delete from storage.objects`, and rightly so — the row is only the bookkeeping entry, the file itself lives elsewhere, so deleting the row would leave a paid-for file nothing can reach
- `reports/` — weekly design/structure check reports, auto-generated by a scheduled Claude Code cloud routine (worth skimming — catches drift from `DESIGN.md`/`CLAUDE.md` and summarizes the week's work)
- `.claude/skills/` — custom Claude Code skills used to review and close out work on this repo (`design-check`, `structure-check`, `wrap-day`)
- `CLAUDE.md` — active plan and current status (the entry point, kept in root; links out to the `docs/` files below)
- `docs/RULES.md` — mandatory per-session rules: how to explain code, git workflow, commit authorship, performance, legal
- `docs/ARCHITECTURE.md` — how data moves through the system: the three layers, the three paths to the database, the main flows step by step, and a security map
- `docs/ROADMAP.md` — long-term vision, the stack and why, stages 1-5, how to learn
- `docs/SHOP.md` — the marketplace vision and phased build order for the shop (creators, storefront, profiles, ratings). ⚠️ Written before the decision to launch single-author — read it as the destination, not the current state
- `docs/IDEAS.md` — backlog of ideas outside the current sprint (subscriptions, PostHog, custom admin, Discord bot)
- `docs/STRUCTURE.md` — the database schema, the reasoning behind it, and the site's page/navigation structure
- `docs/CHANGELOG.md` — dated log of what's shipped and why
- `docs/PLAN-2026-08.md` — the current security-and-payments plan: what blocks what, and the measured limits behind each decision
- `docs/DESIGN.md` — the design system: colors, typography, layout rules, reusable components
- `docs/RESPONSIVE_PLAN.md` — working checklist for the mobile/tablet responsive pass (to be folded into `DESIGN.md` once the breakpoint rules settle)

## Roadmap

1. 🟢 ~~Working portfolio site~~ — done
2. 🟢 ~~Deploy on Vercel~~ — done
3. 🟢 ~~Real content everywhere~~ — done (Discord invite, portfolio, reviews, About me, FAQ, stats, pricing); only the author's photo is still a placeholder
4. 🟡 ~~Mobile/tablet responsive pass~~ — done for everything that existed in July; the account, upload and marketplace screens built since then have not been checked on a phone (see `docs/RESPONSIVE_PLAN.md` for the full breakdown; rules still need porting into `docs/DESIGN.md`)
5. 🟡 Mini content admin backed by Supabase — **in progress**: the site reads everything from Postgres. `/admin/moderation` is the first real admin screen (reviewing creator submissions, where the Table Editor genuinely could not do the job — you cannot judge a map from a table row). Portfolio, reviews and stats are still edited in the Table Editor on purpose, so the requirements are observed rather than guessed
6. Shop: ~~catalog~~, ~~cart~~, ~~Stripe checkout~~, ~~Supabase Auth + accounts~~, ~~"my purchases" + downloads~~, ~~marketplace storefront (Most popular row, redesigned cards, categories, real ratings & purchase counts)~~, ~~multi-creator profiles + product galleries~~, ~~creator self-serve uploads + moderation queue~~ — all live in production and verified by the owner. ⚠️ **The multi-creator half is switched off for launch** (see "What the shop is right now"): version one sells the owner's maps only, so the site can start earning and ranking before carrying the cost of running a marketplace for strangers. Buying requires an account, every user has a public creator profile, creators upload their own maps and the owner reviews them at `/admin/moderation`. Search covers titles, descriptions and creator names. Since then: 🟢 the admin got a full catalog view (an approved map can be taken down or deleted at any time, with a reason and a log), 🟢 creator status is applied for and can be revoked, 🟢 notifications arrive on their own over Supabase Realtime, and 🟢 a map's state became a single guarded column instead of four flags. Since then also: 🟢 maps carry their supported versions, type, modes, themes and size as real fields rather than prose, 🟢 buyers can comment under a map and react to it, and 🟢 a person now has one name — it is their login, their profile address and what everyone sees, changeable once a month. Next: 🔴 **live Stripe payments** — the shop still runs in test mode, so nothing has actually been sold yet; 🟢 ~~route map file uploads through the server~~ — done, and the bucket is now closed to the browser entirely: a handler of ours checks the permission, the rate limit, the size and the extension, picks the object key itself and verifies the file's first bytes after it lands. Malware scanning, which depended on this, finally has somewhere to live; 🔴 the image buckets still take direct writes. Since then also: 🟢 free maps download on their own without going through Stripe (a zero-amount payment session cannot be created, so the server records the order directly), and 🟢 the storefront splits into a shelf of collections and a filtered list — price from/to, Minecraft version, file format, map type, mode, size and theme, plus sorting. Since then also: 🟢 a map's type became a set of up to three rather than one, because a spawn with a town around it honestly is both, and 🟢 the site stopped using the browser's own `confirm()` and `<select>` anywhere — an operating system draws an open native list and no stylesheet can reach it, and browsers can silence `confirm()` for a page permanently, which turns a button into one that quietly does nothing. Rate limits turned out **not** to: 🟢 comments and reactions are capped by database triggers, because a limit belongs wherever the permission is, and the permission is a row-level policy; then real payments, then subscription
7. 🟡 ~~tests~~ (unit suite in CI since 2026-07-20) — done; 🔴 Docker and deeper analytics (e.g. PostHog) — not started
