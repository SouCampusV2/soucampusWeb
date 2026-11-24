import { describe, it, expect } from "vitest";
import { readdirSync } from "fs";
import { join } from "path";
import { NAV_LINKS, DISCORD_INVITE, isLocalPath, safeNextPath } from "./site";

// NAV_LINKS feeds both Navbar.tsx and ContactFooter.tsx — every entry here
// is a promise that a matching page actually exists. This test would have
// caught the old duplicated-array version silently drifting (e.g. one copy
// getting a new page added, the other not).

const APP_DIR = join(__dirname, "..", "app");

// Walks src/app and returns every URL a page.tsx actually serves. Route
// groups — folders in (parentheses), like app/(site) — organise files
// without appearing in the URL, so their segment is dropped here the same
// way Next.js drops it. Building the real route list beats guessing a file
// path from the href: moving pages into a group (or a new one later) can't
// silently break this test the way a hardcoded path did.
function collectRoutes(dir: string, route = ""): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const isGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
      found.push(
        ...collectRoutes(join(dir, entry.name), isGroup ? route : `${route}/${entry.name}`)
      );
    } else if (entry.name === "page.tsx") {
      found.push(route === "" ? "/" : route);
    }
  }
  return found;
}

describe("NAV_LINKS", () => {
  it("points every link at a route that actually has a page.tsx", () => {
    const routes = new Set(collectRoutes(APP_DIR));
    for (const link of NAV_LINKS) {
      expect(routes.has(link.href), `${link.href} -> one of ${[...routes].join(", ")}`).toBe(true);
    }
  });

  it("has no duplicate hrefs", () => {
    const hrefs = NAV_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("DISCORD_INVITE", () => {
  it("is a real https Discord invite URL", () => {
    expect(DISCORD_INVITE).toMatch(/^https:\/\/discord\.com\/invite\//);
  });
});

// Audit 2026-11, S-22: the check used to be "starts with one slash", and
// "/\\evil.com" (slash, backslash) passed it while the browser opened it as "//evil.com".
describe("isLocalPath / safeNextPath", () => {
  it("lets ordinary site paths through", () => {
    expect(isLocalPath("/cart")).toBe(true);
    expect(isLocalPath("/marketplace/some-map?tab=reviews#top")).toBe(true);
    expect(safeNextPath("/purchases")).toBe("/purchases");
  });

  it("rejects absolute and protocol-relative addresses", () => {
    expect(isLocalPath("https://evil.com")).toBe(false);
    expect(isLocalPath("//evil.com")).toBe(false);
    expect(isLocalPath("")).toBe(false);
    expect(isLocalPath(null)).toBe(false);
  });

  it("rejects a backslash anywhere: browsers read it as a slash", () => {
    expect(isLocalPath("/\\evil.com")).toBe(false);
    expect(isLocalPath("/ok/\\evil.com")).toBe(false);
    expect(safeNextPath("/\\evil.com")).toBe("/marketplace");
  });

  it("rejects tabs and newlines: browsers drop them from a URL", () => {
    expect(isLocalPath("/\t/evil.com")).toBe(false);
    expect(isLocalPath("/\n/evil.com")).toBe(false);
  });
});
