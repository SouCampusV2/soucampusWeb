// Single source of truth for the map size -> price/timeline formula.
// Used by BuildEstimator.tsx (the interactive calculator) and terms/page.tsx
// (the plain-text explanation of the same numbers) — changing a rate here
// changes both instead of only the calculator.

export const BASE_RATE = 1.25;
export const HIGH_RATE = 1.5;
export const HIGH_RATE_THRESHOLD = 400;

// Non-square maps (e.g. 125x100) don't have one obvious "side" to price
// off of. sqrt(width * height) is the side length of the SQUARE that has
// the same area — for an actual square input it collapses back to exactly
// that side (sqrt(100*100) = 100), so it doesn't change any of the
// already-agreed square prices, and for a rectangle it's a fair, honest
// stand-in for "how big does this feel" without over- or under-charging
// based on which side happens to be longer.
export function effectiveSize(width: number, height: number) {
  return Math.sqrt(width * height);
}

// Rate per unit of effectiveSize. size 400 itself falls in the higher
// tier — confirmed with the site owner, matches "after a 400x400, it's
// 400*1.5" being read as inclusive of 400.
export function pricePerUnit(size: number) {
  return size >= HIGH_RATE_THRESHOLD ? HIGH_RATE : BASE_RATE;
}

export function estimatePrice(width: number, height: number) {
  const size = effectiveSize(width, height);
  return Math.round(size * pricePerUnit(size));
}

// Anchored to the site owner's own examples (150 -> 1 week, 400 -> min 2
// weeks, 600 -> 3-4 weeks) rather than a formula invented from scratch —
// linearly interpolated between those points, and extrapolated past both
// ends using the slope of the nearest segment. Not meant to be exact this
// far from a real quote, hence the ± range in formatDeadline below.
export const DEADLINE_ANCHORS: [size: number, days: number][] = [
  [150, 7],
  [400, 14],
  [600, 24.5],
];

export function estimateDeadlineDays(width: number, height: number) {
  const size = effectiveSize(width, height);
  const anchors = DEADLINE_ANCHORS;

  const interpolate = (
    [x1, y1]: [number, number],
    [x2, y2]: [number, number],
    x: number
  ) => y1 + ((y2 - y1) / (x2 - x1)) * (x - x1);

  let days: number;
  if (size <= anchors[0][0]) {
    days = interpolate(anchors[0], anchors[1], size);
  } else if (size >= anchors[anchors.length - 1][0]) {
    days = interpolate(anchors[anchors.length - 2], anchors[anchors.length - 1], size);
  } else {
    let lower = anchors[0];
    let upper = anchors[anchors.length - 1];
    for (let i = 0; i < anchors.length - 1; i++) {
      if (size >= anchors[i][0] && size <= anchors[i + 1][0]) {
        lower = anchors[i];
        upper = anchors[i + 1];
        break;
      }
    }
    days = interpolate(lower, upper, size);
  }

  // Never quote under 2 days, even for a tiny build.
  return Math.max(2, days);
}

// Rendered as a ± range (wider than the underlying interpolation implies)
// rather than a single number — real build time depends on detail and
// schedule too, not just footprint, so a fake-precise "17 days" would be
// misleading. Small builds are shown in days, everything from about a
// week up switches to weeks.
export function formatDeadline(days: number) {
  const low = days * 0.85;
  const high = days * 1.15;

  if (high < 7) {
    const lowDays = Math.max(2, Math.round(low));
    const highDays = Math.round(high);
    return lowDays === highDays ? `~${lowDays} days` : `${lowDays}-${highDays} days`;
  }

  const lowWeeks = Math.max(1, Math.round(low / 7));
  const highWeeks = Math.round(high / 7);
  return lowWeeks === highWeeks ? `~${lowWeeks} weeks` : `${lowWeeks}-${highWeeks} weeks`;
}
