import { describe, expect, it } from "vitest";
import { buildPurchaseEmail, formatMoney, orderRefFrom } from "@/lib/purchase-email";
import { SELLER, WAIVER_TEXT } from "@/lib/legal";

const base = {
  items: [{ title: "Hollow Wharf", priceCents: 300, quantity: 1 }],
  totalCents: 300,
  currency: "eur",
  orderRef: "ABCD1234",
  date: new Date("2026-11-24T12:00:00Z"),
};

describe("buildPurchaseEmail", () => {
  it("names the map, the total and where to download", () => {
    const mail = buildPurchaseEmail(base);
    expect(mail.subject).toContain("Hollow Wharf");
    expect(mail.text).toContain("€3.00");
    expect(mail.text).toContain("https://soucampus.online/purchases");
    expect(mail.html).toContain("https://soucampus.online/purchases");
  });

  it("carries what EU law asks for: seller, contact and the waiver the buyer agreed to", () => {
    const mail = buildPurchaseEmail(base);
    for (const part of [mail.text, mail.html]) {
      expect(part).toContain(SELLER.name);
      expect(part).toContain("support@soucampus.online");
      expect(part).toContain(WAIVER_TEXT);
    }
  });

  it("escapes a creator's title in the HTML", () => {
    const mail = buildPurchaseEmail({
      ...base,
      items: [{ title: "<img src=x onerror=alert(1)>", priceCents: 300, quantity: 1 }],
    });
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&lt;img src=x");
  });

  it("speaks of several maps when there are several", () => {
    const mail = buildPurchaseEmail({
      ...base,
      items: [
        { title: "A", priceCents: 100, quantity: 1 },
        { title: "B", priceCents: 200, quantity: 1 },
      ],
    });
    expect(mail.subject).toBe("Your 2 maps are ready to download");
  });
});

describe("helpers", () => {
  it("formats euros", () => {
    expect(formatMoney(1990, "eur")).toBe("€19.90");
  });
  it("takes a short order reference from the session id", () => {
    expect(orderRefFrom("cs_live_a1b2c3d4e5f6g7h8")).toBe("E5F6G7H8");
  });
});
