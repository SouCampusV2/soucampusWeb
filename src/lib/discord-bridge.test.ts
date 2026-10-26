import { describe, expect, it } from "vitest";
import { checkBridgeBody, isDiscordCdnUrl, signBridgeBody, verifyBridgeSignature } from "@/lib/discord-bridge";

// Тот же вектор, что в tests/siteBridge.test.js у бота. Разошлись — один
// из двух тестов красный, и мост не сломается молча на проде.
const VECTOR = {
  secret: "test-secret",
  timestamp: "1767225600",
  body: '{"hello":"world"}',
  signature: "adb73f4965c2de3ba36a1ece69109fa5109777bdc9ca68c576458eb8004a2ed5",
};

describe("подпись моста", () => {
  it("совпадает с ботом на общем векторе", () => {
    expect(signBridgeBody(VECTOR.secret, VECTOR.timestamp, VECTOR.body)).toBe(VECTOR.signature);
  });

  it("принимает верную и свежую", () => {
    expect(verifyBridgeSignature(VECTOR.secret, VECTOR.timestamp, VECTOR.signature, VECTOR.body, 1767225600)).toBeNull();
  });

  it("отказывает: чужое тело, старое время, нет секрета, мусор вместо подписи", () => {
    expect(verifyBridgeSignature(VECTOR.secret, VECTOR.timestamp, VECTOR.signature, '{"hello":"x"}', 1767225600)).toBe("bad signature");
    expect(verifyBridgeSignature(VECTOR.secret, VECTOR.timestamp, VECTOR.signature, VECTOR.body, 1767225600 + 3600)).toBe("stale timestamp");
    expect(verifyBridgeSignature("", VECTOR.timestamp, VECTOR.signature, VECTOR.body, 1767225600)).toBe("secret not configured");
    expect(verifyBridgeSignature(VECTOR.secret, VECTOR.timestamp, "zz", VECTOR.body, 1767225600)).toBe("bad signature");
  });
});

describe("тело моста", () => {
  const draft = {
    ticketId: "abc123def456", need: "Spawn", theme: "Medieval", version: "1.21", sizeLabel: "200×200",
    sizeX: 200, sizeZ: 200, priceAmount: 300, priceLabel: "€300", deadlineDays: 12, completedAt: 1767225600000,
    images: ["https://cdn.discordapp.com/attachments/1/2/shot.png"],
  };

  it("принимает черновик и отзыв", () => {
    expect(checkBridgeBody({ key: "portfolio:abc123def456", kind: "portfolio_draft", payload: draft })).toBeNull();
    expect(
      checkBridgeBody({ key: "review:abc123def456", kind: "review", payload: { ticketId: "abc123def456", rating: 5, comment: "Great", name: "Alice" } })
    ).toBeNull();
  });

  it("не даёт скачивать откуда угодно (SSRF)", () => {
    expect(isDiscordCdnUrl("http://cdn.discordapp.com/x.png")).toBe(false);
    expect(isDiscordCdnUrl("https://169.254.169.254/latest")).toBe(false);
    expect(isDiscordCdnUrl("https://cdn.discordapp.com.evil.com/x.png")).toBe(false);
    expect(checkBridgeBody({ key: "portfolio:abc123def456", kind: "portfolio_draft", payload: { ...draft, images: ["https://evil.com/a.png"] } })).toBe("bad images");
  });

  it("отказывает на рейтинге вне 1–5 и на чужом ключе", () => {
    expect(checkBridgeBody({ key: "review:abc123def456", kind: "review", payload: { ticketId: "abc123def456", rating: 9, comment: "", name: "A" } })).toBe("bad rating");
    expect(checkBridgeBody({ key: "../../etc", kind: "review", payload: {} })).toBe("bad key");
  });

  it("ticketId — ровно хвост ключа: в путь Storage не попадёт ничего чужого", () => {
    expect(
      checkBridgeBody({ key: "portfolio:abc123def456", kind: "portfolio_draft", payload: { ...draft, ticketId: "../../x" } })
    ).toBe("ticketId must match the key");
    expect(
      checkBridgeBody({ key: "review:abc123def456", kind: "portfolio_draft", payload: draft })
    ).toBe("kind must match the key");
  });
});
