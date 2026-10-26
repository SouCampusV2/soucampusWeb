import { describe, it, expect } from "vitest";
import {
  checkProfileLink,
  parseProfileLinks,
  profileLinkLabel,
  PROFILE_LINKS_MAX,
} from "./profile-links";

// Копия правил profile_links_valid (миграция 20261026120000). Базу CI не
// видит, поэтому здесь закреплено то, что интерфейс обещает человеку, —
// и главное из правил: иконка не может врать о том, куда ведёт ссылка.

describe("checkProfileLink", () => {
  it("дописывает https:// к адресу без схемы", () => {
    expect(checkProfileLink("x", "x.com/SouCampusBuilds")).toEqual({
      ok: true,
      url: "https://x.com/SouCampusBuilds",
    });
  });

  it("пускает поддомены своего домена", () => {
    expect(checkProfileLink("youtube", "https://www.youtube.com/@SouCampus").ok).toBe(true);
    expect(checkProfileLink("twitch", "m.twitch.tv/someone").ok).toBe(true);
  });

  it("не пускает чужой домен под знакомой иконкой", () => {
    expect(checkProfileLink("discord", "https://discord-gift.example.com/x").ok).toBe(false);
    // Суффикс без точки — не поддомен: notdiscord.gg ≠ discord.gg.
    expect(checkProfileLink("discord", "https://notdiscord.gg/abc").ok).toBe(false);
  });

  it("не пускает логин в адресе — классику подмены хоста", () => {
    // Читается как discord.com, ведёт на evil.com.
    expect(checkProfileLink("discord", "https://discord.com@evil.com/").ok).toBe(false);
    expect(checkProfileLink("website", "https://user:pass@example.com/").ok).toBe(false);
  });

  it("не пускает порт, http и чужие схемы", () => {
    expect(checkProfileLink("website", "https://example.com:8080/").ok).toBe(false);
    expect(checkProfileLink("website", "http://example.com/").ok).toBe(false);
    expect(checkProfileLink("website", "javascript:alert(1)").ok).toBe(false);
  });

  it("website — любой https-домен, но не одно слово", () => {
    expect(checkProfileLink("website", "soucampus.online").ok).toBe(true);
    expect(checkProfileLink("website", "localhost").ok).toBe(false);
  });

  it("пустое поле — ошибка с названием вида", () => {
    const result = checkProfileLink("tiktok", "  ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("TikTok");
  });
});

describe("parseProfileLinks", () => {
  it("выбрасывает негодное, оставляя годное", () => {
    expect(
      parseProfileLinks([
        { kind: "x", url: "https://x.com/a" },
        { kind: "discord", url: "https://evil.com/" },
        { kind: "myspace", url: "https://myspace.com/a" },
        "junk",
        null,
      ]),
    ).toEqual([{ kind: "x", url: "https://x.com/a" }]);
  });

  it("не верит не-массиву и режет по пределу", () => {
    expect(parseProfileLinks(null)).toEqual([]);
    expect(parseProfileLinks({ kind: "x" })).toEqual([]);
    const many = Array.from({ length: 12 }, (_, i) => ({
      kind: "website",
      url: `https://site${i}.com/`,
    }));
    expect(parseProfileLinks(many)).toHaveLength(PROFILE_LINKS_MAX);
  });
});

describe("profileLinkLabel", () => {
  it("у сайта подписью служит домен без www", () => {
    expect(profileLinkLabel({ kind: "website", url: "https://www.example.com/me" })).toBe(
      "example.com",
    );
    expect(profileLinkLabel({ kind: "planetminecraft", url: "https://planetminecraft.com/" })).toBe(
      "Planet Minecraft",
    );
  });
});
