import { describe, expect, it } from "vitest";
import { hashtags, shareMetadata } from "@/lib/share";
import { SITE_NAME } from "@/lib/site";

const base = {
  kind: "portfolio" as const,
  path: "/portfolio/pirate-rpg",
  title: "Pirate RPG Map",
  text: "A massive pirate map.",
  tags: ["Minecraft", "MinecraftBuilds"],
  images: ["/a.png"],
  imageAlt: "Pirate RPG Map",
};

describe("hashtags", () => {
  it("strips spaces and punctuation from each tag", () => {
    expect(hashtags(["Personal project", "Mine-craft!"])).toBe("#Personalproject #Minecraft");
  });

  it("drops tags that end up empty", () => {
    expect(hashtags(["Minecraft", " – "])).toBe("#Minecraft");
  });
});

describe("shareMetadata", () => {
  it("keeps siteName on the card — the page's openGraph replaces the layout's", () => {
    const meta = shareMetadata(base);
    expect(meta.openGraph).toMatchObject({ siteName: SITE_NAME });
  });

  it("keeps canonical next to the oEmbed link", () => {
    const meta = shareMetadata(base);
    expect(meta.alternates).toEqual({
      canonical: "/portfolio/pirate-rpg",
      types: { "application/json+oembed": "/oembed/portfolio" },
    });
  });

  it("puts hashtags on their own line after the text", () => {
    const meta = shareMetadata(base);
    expect(meta.openGraph?.description).toBe(
      "A massive pirate map.\n\n#Minecraft #MinecraftBuilds",
    );
  });

  it("gives at most four images, without repeats, cover first", () => {
    const meta = shareMetadata({
      ...base,
      images: ["/cover.png", "/1.png", "/cover.png", "/2.png", "/3.png", "/4.png"],
    });
    const urls = (meta.openGraph?.images as { url: string }[]).map((i) => i.url);
    expect(urls).toEqual(["/cover.png", "/1.png", "/2.png", "/3.png"]);
  });
});
