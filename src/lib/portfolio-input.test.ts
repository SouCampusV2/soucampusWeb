import { describe, expect, it } from "vitest";
import {
  checkProjectInput,
  isPortfolioImageUrl,
  slugify,
  type ProjectInput,
} from "@/lib/portfolio-input";

const SUPABASE = "https://abc.supabase.co";
const OWN = `${SUPABASE}/storage/v1/object/public/portfolio-images/u1/1.webp`;

const valid: ProjectInput = {
  slug: "redspire-commons",
  title: "Redspire Commons",
  tag: "Order",
  summary: "A village hub.",
  description: "Long text.",
  priceLabel: "€150",
  priceAmount: 150,
  sizeLabel: "250×250",
  sizeX: 250,
  sizeZ: 250,
  deadlineLabel: "1 week",
  isFeatured: false,
  sortOrder: 3,
  listingUrl: null,
  listingIsFree: false,
  image: OWN,
  gallery: ["/portfolio/old.webp"],
};

describe("slugify", () => {
  it("делает адрес из названия", () => {
    expect(slugify("Redspire Commons")).toBe("redspire-commons");
    expect(slugify("  Café — Spawn!! ")).toBe("cafe-spawn");
  });
});

describe("isPortfolioImageUrl", () => {
  it("пускает свой файл из public/ и свой бакет", () => {
    expect(isPortfolioImageUrl("/portfolio/a.webp", SUPABASE)).toBe(true);
    expect(isPortfolioImageUrl(OWN, SUPABASE)).toBe(true);
  });

  it("не пускает чужой сервер, протокол-относительный адрес и чужой бакет", () => {
    expect(isPortfolioImageUrl("https://evil.com/a.png", SUPABASE)).toBe(false);
    expect(isPortfolioImageUrl("//evil.com/a.png", SUPABASE)).toBe(false);
    expect(
      isPortfolioImageUrl(`${SUPABASE}/storage/v1/object/public/product-images/u1/a.png`, SUPABASE)
    ).toBe(false);
  });
});

describe("checkProjectInput", () => {
  it("правильная работа проходит", () => {
    expect(checkProjectInput(valid, SUPABASE)).toBeNull();
  });

  it("отказывает в кривом адресе", () => {
    expect(checkProjectInput({ ...valid, slug: "Red Spire" }, SUPABASE)).not.toBeNull();
    expect(checkProjectInput({ ...valid, slug: "a--b" }, SUPABASE)).not.toBeNull();
  });

  it("ссылка на магазин — только https", () => {
    expect(checkProjectInput({ ...valid, listingUrl: "javascript:alert(1)" }, SUPABASE)).not.toBeNull();
    expect(checkProjectInput({ ...valid, listingUrl: "builtbybit.com/x" }, SUPABASE)).not.toBeNull();
    expect(checkProjectInput({ ...valid, listingUrl: "https://builtbybit.com/x" }, SUPABASE)).toBeNull();
  });

  it("обложка и галерея — только наши картинки", () => {
    expect(checkProjectInput({ ...valid, image: "https://evil.com/a.png" }, SUPABASE)).not.toBeNull();
    expect(checkProjectInput({ ...valid, gallery: ["https://evil.com/a.png"] }, SUPABASE)).not.toBeNull();
  });

  it("числа — положительные или пусто", () => {
    expect(checkProjectInput({ ...valid, priceAmount: -1 }, SUPABASE)).not.toBeNull();
    expect(checkProjectInput({ ...valid, sizeX: null, sizeZ: null, priceAmount: null }, SUPABASE)).toBeNull();
    expect(checkProjectInput({ ...valid, sortOrder: 1.5 }, SUPABASE)).not.toBeNull();
  });

  it("подписи обязательны", () => {
    expect(checkProjectInput({ ...valid, priceLabel: " " }, SUPABASE)).not.toBeNull();
  });
});
