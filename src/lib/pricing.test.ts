import { describe, it, expect } from "vitest";
import {
  BASE_RATE,
  HIGH_RATE,
  HIGH_RATE_THRESHOLD,
  effectiveSize,
  pricePerUnit,
  estimatePrice,
  estimateDeadlineDays,
  formatDeadline,
} from "./pricing";

// Covers the formula behind BuildEstimator.tsx (the interactive calculator
// on /contact) and the plain-text explanation on /terms#pricing — both now
// read from this same module, so these tests protect both surfaces at once.

describe("effectiveSize", () => {
  it("returns the side length unchanged for a square map", () => {
    expect(effectiveSize(100, 100)).toBe(100);
  });

  it("returns the geometric mean side for a non-square map", () => {
    // sqrt(150 * 100) ≈ 122.47 — matches the /terms#pricing worked example.
    expect(effectiveSize(150, 100)).toBeCloseTo(122.47, 1);
  });
});

describe("pricePerUnit", () => {
  it("charges the base rate below the high-rate threshold", () => {
    expect(pricePerUnit(HIGH_RATE_THRESHOLD - 1)).toBe(BASE_RATE);
  });

  it("charges the high rate exactly AT the threshold (inclusive)", () => {
    expect(pricePerUnit(HIGH_RATE_THRESHOLD)).toBe(HIGH_RATE);
  });

  it("charges the high rate above the threshold", () => {
    expect(pricePerUnit(HIGH_RATE_THRESHOLD + 100)).toBe(HIGH_RATE);
  });
});

describe("estimatePrice", () => {
  // Matches the exact worked examples on /terms#pricing — if these ever
  // disagree, the site is showing two different prices for the same map.
  it("prices a 100x100 map at 125€", () => {
    expect(estimatePrice(100, 100)).toBe(100 * BASE_RATE);
  });

  it("prices a 200x200 map at 250€", () => {
    expect(estimatePrice(200, 200)).toBe(200 * BASE_RATE);
  });

  it("prices a 400x400 map at the high rate (600€)", () => {
    expect(estimatePrice(400, 400)).toBe(400 * HIGH_RATE);
  });

  it("prices a 1000x1000 map at 1500€", () => {
    expect(estimatePrice(1000, 1000)).toBe(1000 * HIGH_RATE);
  });

  it("prices a non-square map off its effective (geometric-mean) side, not either raw side", () => {
    const price = estimatePrice(150, 100);
    const bySide150 = Math.round(150 * BASE_RATE);
    const bySide100 = Math.round(100 * BASE_RATE);
    expect(price).toBeGreaterThan(bySide100);
    expect(price).toBeLessThan(bySide150);
  });
});

describe("estimateDeadlineDays", () => {
  it("matches the site owner's anchor points", () => {
    expect(estimateDeadlineDays(150, 150)).toBeCloseTo(7, 5);
    expect(estimateDeadlineDays(400, 400)).toBeCloseTo(14, 5);
    expect(estimateDeadlineDays(600, 600)).toBeCloseTo(24.5, 5);
  });

  it("never quotes under 2 days, even for a tiny build", () => {
    expect(estimateDeadlineDays(1, 1)).toBeGreaterThanOrEqual(2);
  });

  it("extrapolates upward past the largest anchor instead of capping", () => {
    const at600 = estimateDeadlineDays(600, 600);
    const at1000 = estimateDeadlineDays(1000, 1000);
    expect(at1000).toBeGreaterThan(at600);
  });
});

describe("formatDeadline", () => {
  it("formats small builds in days, not weeks", () => {
    expect(formatDeadline(3)).toMatch(/days?/);
  });

  it("formats week-scale builds in weeks, not days", () => {
    expect(formatDeadline(14)).toMatch(/weeks?/);
  });

  it("never formats a range below the 2-day floor", () => {
    const label = formatDeadline(2);
    expect(label).not.toMatch(/^0-|^1-/);
  });
});
