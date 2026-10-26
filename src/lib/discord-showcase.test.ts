import { describe, expect, it } from "vitest";
import { checkPost, draftFromProject, publishPost, toWebhookPayload, updatePost, deletePost } from "@/lib/discord-showcase";

const project = {
  slug: "corsair-isle",
  title: "Corsair Isle",
  tag: "Order",
  summary: "A tropical volcano island.",
  image: "/portfolio/corsair-isle.jpg",
  priceLabel: "€200",
  sizeLabel: "250×250",
  deadlineLabel: "1 week",
  listingUrl: "https://builtbybit.com/resources/x.1/",
  listingIsFree: true,
};

describe("черновик из работы", () => {
  const post = draftFromProject(project, "https://soucampus.online");
  it("делает картинку абсолютной и ставит ссылки", () => {
    expect(post.imageUrl).toBe("https://soucampus.online/portfolio/corsair-isle.jpg");
    expect(post.url).toBe("https://soucampus.online/portfolio/corsair-isle");
    expect(post.buttons.map((b) => b.label)).toEqual(["View on website", "Download free"]);
    expect(checkPost(post)).toBeNull();
  });
  it("по умолчанию никого не пингует", () => {
    expect(toWebhookPayload(post).allowed_mentions).toEqual({ parse: [] });
    expect(toWebhookPayload(post).content).toBe("");
  });
});

describe("проверка поста", () => {
  const base = draftFromProject(project, "https://soucampus.online");
  it("ловит то, что Discord отклонит", () => {
    expect(checkPost({ ...base, title: "" })).toMatch(/title/i);
    expect(checkPost({ ...base, imageUrl: "http://x/a.png" })).toMatch(/https/);
    expect(checkPost({ ...base, buttons: [{ label: "x", url: "javascript:alert(1)" }] })).toMatch(/https/);
    expect(checkPost({ ...base, color: "orange" })).toMatch(/Colour/);
    expect(checkPost({ ...base, body: "x".repeat(5000) })).toMatch(/4096/);
  });
});

describe("вебхук", () => {
  const post = draftFromProject(project, "https://soucampus.online");
  const hook = "https://discord.com/api/webhooks/1/abc";

  it("публикует с wait=true и возвращает id сообщения", async () => {
    let seen = "";
    const fetchFn = (async (url: string) => {
      seen = url;
      return new Response(JSON.stringify({ id: "999" }), { status: 200 });
    }) as unknown as typeof fetch;
    expect(await publishPost(hook, post, fetchFn)).toEqual({ ok: true, messageId: "999" });
    expect(seen).toBe(`${hook}?wait=true&with_components=true`);
  });

  it("правит и удаляет по id; удалённый руками пост — не ошибка", async () => {
    const calls: string[] = [];
    const fetchFn = (async (url: string, init: RequestInit) => {
      calls.push(`${init.method} ${url}`);
      return new Response(init.method === "DELETE" ? null : "{}", { status: init.method === "DELETE" ? 404 : 200 });
    }) as unknown as typeof fetch;
    expect((await updatePost(hook, "999", post, fetchFn)).ok).toBe(true);
    expect((await deletePost(hook, "999", fetchFn)).ok).toBe(true);
    expect(calls).toEqual([`PATCH ${hook}/messages/999?wait=true&with_components=true`, `DELETE ${hook}/messages/999`]);
  });
});
