import { describe, it, expect } from "vitest";
import { toJsonLdScript } from "./json-ld";

describe("toJsonLdScript", () => {
  it("не даёт значению закрыть тег <script>", () => {
    const out = toJsonLdScript({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script");
    expect(out).not.toContain("<");
  });

  it("не меняет смысл: разбирается обратно в те же данные", () => {
    const data = { name: "a < b </script>", nested: { list: ["<x>", 1, true] } };
    expect(JSON.parse(toJsonLdScript(data))).toEqual(data);
  });

  it("обычные данные выдаёт как JSON.stringify", () => {
    const data = { "@type": "Person", name: "SouCampus" };
    expect(toJsonLdScript(data)).toBe(JSON.stringify(data));
  });
});
