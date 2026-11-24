import { describe, expect, it } from "vitest";
import { checkPriceRight, FREE_ONLY_MESSAGE } from "@/lib/paid-maps";

describe("checkPriceRight", () => {
  it("lets anyone publish a free map", () => {
    expect(checkPriceRight(0, false)).toBeNull();
    expect(checkPriceRight(0, true)).toBeNull();
  });

  it("refuses a paid price to a creator who is not the admin", () => {
    expect(checkPriceRight(300, false)).toBe(FREE_ONLY_MESSAGE);
  });

  it("lets the admin set a paid price", () => {
    expect(checkPriceRight(300, true)).toBeNull();
  });
});
