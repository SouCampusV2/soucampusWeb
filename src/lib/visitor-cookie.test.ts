import { describe, it, expect } from "vitest";
import { issueVisitorId, readVisitorId } from "./visitor-cookie";

const SECRET = "тестовая-соль-не-из-продакшена";

describe("issueVisitorId", () => {
  it("выдаёт разные id каждый раз", () => {
    const a = issueVisitorId(SECRET);
    const b = issueVisitorId(SECRET);
    expect(a.id).not.toBe(b.id);
  });

  it("кладёт в cookie сам id и подпись через точку", () => {
    const { id, cookieValue } = issueVisitorId(SECRET);
    expect(cookieValue.startsWith(`${id}.`)).toBe(true);
    expect(cookieValue.length).toBeGreaterThan(id.length + 10);
  });
});

describe("readVisitorId", () => {
  it("принимает свою же cookie", () => {
    const { id, cookieValue } = issueVisitorId(SECRET);
    expect(readVisitorId(cookieValue, SECRET)).toBe(id);
  });

  it("отвергает голый uuid без подписи", () => {
    // Ровно этим обходилась защита до подписи: прислал любой uuid —
    // и сервер считал тебя знакомым посетителем, а таких он не
    // проверяет на лимит с одного адреса.
    expect(
      readVisitorId("11111111-2222-3333-4444-555555555555", SECRET)
    ).toBeNull();
  });

  it("отвергает подделанную подпись", () => {
    const { id } = issueVisitorId(SECRET);
    expect(readVisitorId(`${id}.поддельнаяподпись`, SECRET)).toBeNull();
  });

  it("отвергает чужой id, приклеенный к настоящей подписи", () => {
    const { cookieValue } = issueVisitorId(SECRET);
    const signature = cookieValue.split(".")[1];
    const otherId = "99999999-8888-7777-6666-555555555555";
    expect(readVisitorId(`${otherId}.${signature}`, SECRET)).toBeNull();
  });

  it("отвергает cookie, подписанную другим секретом", () => {
    const { cookieValue } = issueVisitorId("секрет-злоумышленника");
    expect(readVisitorId(cookieValue, SECRET)).toBeNull();
  });

  it("отвергает мусор вместо cookie", () => {
    for (const junk of [undefined, "", ".", "..", "abc", "abc.def", "."]) {
      expect(readVisitorId(junk as string | undefined, SECRET)).toBeNull();
    }
  });

  it("не путает похожий на uuid мусор с настоящим id", () => {
    // Старая проверка была /^[0-9a-f-]{36}$/i и пропускала строку из
    // 36 дефисов — в базу мог попасть id, которого сервер не выдавал.
    expect(readVisitorId("-".repeat(36) + ".x", SECRET)).toBeNull();
  });
});
