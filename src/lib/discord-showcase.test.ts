import { describe, expect, it } from "vitest";
import {
  channelForProduct,
  checkPost,
  deletePost,
  draftFromProduct,
  draftFromProject,
  hexColor,
  postText,
  publishPost,
  SHOWCASE_CHANNELS,
  toWebhookPayload,
  updatePost,
} from "@/lib/discord-showcase";

const project = {
  slug: "corsair-isle",
  title: "Corsair Isle",
  summary: "A tropical volcano island.",
  image: "/portfolio/corsair-isle.jpg",
  gallery: ["/portfolio/corsair-2.jpg"],
  sizeLabel: "250×250",
  deadlineLabel: "1 week",
  listingUrl: "https://builtbybit.com/resources/x.1/",
  listingIsFree: true,
};
const SITE = "https://soucampus.online";

describe("черновик из работы", () => {
  const post = draftFromProject(project, SITE);
  it("стиль сообщения: заголовок с чертой, факты мелким, ссылки списком", () => {
    const { main, links } = postText(post);
    expect(main).toBe("# Corsair Isle ——\nA tropical volcano island.\n-# 250×250 · built in 1 week");
    expect(links).toContain("- [See it on our website](https://soucampus.online/portfolio/corsair-isle)");
    expect(links).toContain("- [Download it free](https://builtbybit.com/resources/x.1/)");
    expect(links).toContain("- [Order your own build](https://soucampus.online/contact) - **Let's create something together!**");
  });
  it("картинки абсолютные, обложка первой", () => {
    expect(post.imageUrls).toEqual(["https://soucampus.online/portfolio/corsair-isle.jpg", "https://soucampus.online/portfolio/corsair-2.jpg"]);
    expect(checkPost(post)).toBeNull();
  });
});

describe("пинги", () => {
  const base = draftFromProject(project, SITE);
  it("по умолчанию никого", () => {
    expect(toWebhookPayload(base).allowed_mentions).toEqual({ parse: [] });
  });
  it("роль — в конце текста и только эта роль", () => {
    const post = { ...base, mention: "role" as const, roleId: "123456789012345678" };
    expect(postText(post).main).toMatch(/<@&123456789012345678>$/);
    expect(toWebhookPayload(post).allowed_mentions).toEqual({ parse: [], roles: ["123456789012345678"] });
  });
  it("роль без ID не проходит", () => {
    expect(checkPost({ ...base, mention: "role", roleId: null })).toMatch(/Role ID/);
  });
});

describe("проверка поста", () => {
  const base = draftFromProject(project, SITE);
  it("ловит то, что Discord отклонит", () => {
    expect(checkPost({ ...base, title: "" })).toMatch(/title/i);
    expect(checkPost({ ...base, imageUrls: [] })).toMatch(/picture/);
    expect(checkPost({ ...base, links: [{ label: "x", url: "javascript:alert(1)", tagline: "" }] })).toMatch(/https/);
    expect(checkPost({ ...base, username: "Discord Team" })).toMatch(/Discord/);
    expect(checkPost({ ...base, body: "x".repeat(4100) })).toMatch(/4000/);
  });
  it("скобки в тексте ссылки не ломают markdown", () => {
    const { links } = postText({ ...base, links: [{ label: "Map [v2]", url: "https://a.b/x (1)", tagline: "" }] });
    expect(links).toBe("- [Map v2](https://a.b/x%20(1%29)");
  });
});

describe("вебхук", () => {
  const post = draftFromProject(project, SITE);
  const hook = "https://discord.com/api/webhooks/1/abc";

  it("публикует V2-сообщение с wait=true и возвращает id", async () => {
    let seen = "";
    let body: { flags?: number; components?: { type: number }[] } = {};
    const fetchFn = (async (url: string, init: RequestInit) => {
      seen = url;
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ id: "999" }), { status: 200 });
    }) as unknown as typeof fetch;
    expect(await publishPost(hook, { ...post, username: "SouCampus" }, fetchFn)).toEqual({ ok: true, messageId: "999" });
    expect(seen).toBe(`${hook}?wait=true&with_components=true`);
    expect(body.flags).toBe(32768);
    expect(body.components?.map((c) => c.type)).toEqual([10, 10, 12]);
  });

  it("правка не шлёт имя/аватар; удалённый руками пост — не ошибка", async () => {
    const calls: { method: string; url: string; body: string | null }[] = [];
    const fetchFn = (async (url: string, init: RequestInit) => {
      calls.push({ method: String(init.method), url, body: init.body ? String(init.body) : null });
      return new Response(init.method === "DELETE" ? null : "{}", { status: init.method === "DELETE" ? 404 : 200 });
    }) as unknown as typeof fetch;
    expect((await updatePost(hook, "999", { ...post, username: "SouCampus" }, fetchFn)).ok).toBe(true);
    expect((await deletePost(hook, "999", fetchFn)).ok).toBe(true);
    expect(calls[0].body).not.toContain("username");
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `PATCH ${hook}/messages/999?wait=true&with_components=true`,
      `DELETE ${hook}/messages/999`,
    ]);
  });
});

describe("каналы и плашка (27.10)", () => {
  const post = draftFromProject(project, SITE);

  it("с цветом всё уходит в контейнер с плашкой", () => {
    const payload = toWebhookPayload(post, SHOWCASE_CHANNELS.premade.color) as {
      components: { type: number; accent_color?: number; components?: { type: number }[] }[];
    };
    expect(payload.components).toHaveLength(1);
    expect(payload.components[0].type).toBe(17);
    expect(payload.components[0].accent_color).toBe(0x84cc16);
    expect(payload.components[0].components?.map((c) => c.type)).toEqual([10, 10, 12]);
  });

  it("цвета каналов — как у закреплённых постов", () => {
    expect(hexColor(SHOWCASE_CHANNELS.portfolio.color)).toBe("#f97316");
    expect(hexColor(SHOWCASE_CHANNELS.premade.color)).toBe("#84cc16");
    expect(hexColor(SHOWCASE_CHANNELS.free.color)).toBe("#3b82f6");
  });

  const map = {
    slug: "sky-hub",
    title: "Sky Hub",
    summary: "A floating hub.",
    images: ["/x.webp", "https://cdn.example.com/a.webp"],
    price: "€15",
    priceCents: 1500,
    mapSize: "Medium",
    mcVersions: ["1.20", "1.21"],
  };

  it("платная карта — Premade, цена и ссылка «Get this map»", () => {
    expect(channelForProduct(map)).toBe("premade");
    const draft = draftFromProduct(map, SITE);
    expect(draft.body).toBe("A floating hub.\n-# €15 · Medium · Minecraft 1.20, 1.21");
    expect(draft.links[0]).toEqual({ label: "Get this map", url: `${SITE}/marketplace/sky-hub`, tagline: "" });
    expect(draft.imageUrls).toEqual([`${SITE}/x.webp`, "https://cdn.example.com/a.webp"]);
    expect(checkPost(draft)).toBeNull();
  });

  it("бесплатная — Free и «Download it free»", () => {
    const free = { ...map, priceCents: 0, price: "Free", mapSize: null, mcVersions: [] };
    expect(channelForProduct(free)).toBe("free");
    const draft = draftFromProduct(free, SITE);
    expect(draft.body).toBe("A floating hub.\n-# Free");
    expect(draft.links[0].label).toBe("Download it free");
  });
});

// ------------------------------------------------------------
// Дописано при переносе на сайт (26.10).
// ------------------------------------------------------------
import { isShowcasePostShape, normalizeShowcasePost } from "@/lib/discord-showcase";

describe("форма черновика и старый формат", () => {
  const post = draftFromProject(project, SITE);

  it("свежий черновик проходит проверку формы как есть", () => {
    expect(isShowcasePostShape(post)).toBe(true);
    expect(normalizeShowcasePost(post)).toBe(post);
  });

  it("не пускает строку с битыми полями", () => {
    expect(isShowcasePostShape({ ...post, links: "nope" })).toBe(false);
    expect(isShowcasePostShape(null)).toBe(false);
  });

  it("переводит пост первого редактора (эмбед) в новый формат", () => {
    const old = {
      title: "Corsair Isle",
      url: "https://soucampus.online/portfolio/corsair-isle",
      body: "A tropical island.",
      imageUrl: "https://soucampus.online/portfolio/corsair-isle.jpg",
      color: "#f97316",
      fields: [{ name: "Size", value: "250×250", inline: true }],
      buttons: [{ label: "View on website", url: "https://soucampus.online/portfolio/corsair-isle" }],
      mention: "none",
      authorName: "SouCampus portfolio · Order",
    };
    const converted = normalizeShowcasePost(old);
    expect(converted).not.toBeNull();
    expect(isShowcasePostShape(converted)).toBe(true);
    expect(converted?.body).toBe("A tropical island.\n-# Size: 250×250");
    expect(converted?.links[0].url).toBe(old.url);
    expect(converted?.imageUrls).toEqual([old.imageUrl]);
    expect(checkPost(converted!)).toBeNull();
  });
});
