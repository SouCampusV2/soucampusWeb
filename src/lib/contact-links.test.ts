import { describe, it, expect } from "vitest";
import { checkPortfolioUrl, checkDiscord } from "./contact-links";

// Граница «что человек напечатал → что мы согласны хранить». Тесты
// строже обычного на отказах: пропущенный мусор стоит модератору
// открытой вкладки в никуда, а пропущенный `javascript:` — исполнения
// чужого кода на странице с самыми широкими правами на сайте.

describe("checkPortfolioUrl", () => {
  it("принимает обычную ссылку и оставляет её собой", () => {
    const result = checkPortfolioUrl("https://planetminecraft.com/member/soucampus");
    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toContain("planetminecraft.com");
  });

  it("дописывает https:// когда схемы нет", () => {
    const result = checkPortfolioUrl("youtube.com/@SouCampus");
    expect(result.ok && result.value.startsWith("https://")).toBe(true);
  });

  it("считает пустую строку законной — поле необязательное", () => {
    expect(checkPortfolioUrl("   ")).toEqual({ ok: true, value: "" });
  });

  it("отклоняет текст, который ссылкой не является", () => {
    expect(checkPortfolioUrl("залупа какая-то").ok).toBe(false);
    // Одно слово разбирается как валидный URL с хостом без точки —
    // ровно та дыра, ради которой проверка на точку и существует.
    expect(checkPortfolioUrl("https://portfolio").ok).toBe(false);
  });

  it("НЕ пропускает javascript: и data:", () => {
    // Ссылка едет в href на странице админки: по клику владельца
    // javascript: выполнился бы с его правами.
    expect(checkPortfolioUrl("javascript:alert(1)").ok).toBe(false);
    expect(checkPortfolioUrl("data:text/html,<script>alert(1)</script>").ok).toBe(false);
  });

  it("не превращает javascript: в https-ссылку дописыванием схемы", () => {
    // Проверка идёт по "://", а не по "http": иначе приставка https://
    // приклеилась бы спереди и строка прошла бы как обычный адрес.
    const result = checkPortfolioUrl("javascript:alert(1)");
    expect(result.ok).toBe(false);
  });
});

describe("checkDiscord", () => {
  it("принимает современный ник и приводит его к нижнему регистру", () => {
    expect(checkDiscord("SouCampus")).toEqual({ ok: true, value: "soucampus" });
  });

  it("срезает @, дописанную по привычке", () => {
    expect(checkDiscord("@soucampus")).toEqual({ ok: true, value: "soucampus" });
  });

  it("принимает старый формат с дискриминатором как есть", () => {
    expect(checkDiscord("SouCampus#1234")).toEqual({
      ok: true,
      value: "SouCampus#1234",
    });
  });

  it("принимает ссылку-приглашение", () => {
    expect(checkDiscord("https://discord.gg/abc123").ok).toBe(true);
  });

  it("отклоняет ссылку на чужой домен", () => {
    expect(checkDiscord("https://example.com/abc").ok).toBe(false);
  });

  it("отклоняет произвольный текст и пробелы внутри", () => {
    expect(checkDiscord("залупа какая-то").ok).toBe(false);
    expect(checkDiscord("sou campus").ok).toBe(false);
    expect(checkDiscord("a").ok).toBe(false);
  });

  it("считает пустую строку законной", () => {
    expect(checkDiscord("")).toEqual({ ok: true, value: "" });
  });
});
