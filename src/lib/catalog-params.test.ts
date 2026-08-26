import { describe, it, expect } from "vitest";
import { activeFilterCount, readCatalogQuery } from "./catalog-params";

// Разбор фильтров витрины из адреса. Чистая функция, в сеть не ходит —
// тот же подход, что в products.test.ts.
//
// Тесты здесь про доверие к адресу: его правит кто угодно, и каждая
// строка ниже описывает, что происходит с тем, чего мы не ожидали.

const read = (query: string) => readCatalogQuery(new URLSearchParams(query));

describe("readCatalogQuery", () => {
  it("пустой адрес — ни одного условия", () => {
    const q = read("");
    expect(q.sort).toBeNull();
    expect(q.minCents).toBeNull();
    expect(q.maxCents).toBeNull();
    expect(q.specs.mcVersions).toEqual([]);
    expect(activeFilterCount(q)).toBe(0);
  });

  it("списки приходят через запятую и чистятся от пустот", () => {
    const q = read("mc=1.21,%201.20,,");
    expect(q.specs.mcVersions).toEqual(["1.21", "1.20"]);
  });

  it("повторы в одном поле схлопываются", () => {
    // Иначе одно и то же значение сравнивалось бы дважды на каждой карте.
    expect(read("fmt=Schematic,Schematic").specs.formats).toEqual([
      "Schematic",
    ]);
  });

  it("неизвестная сортировка — как будто её не задавали", () => {
    expect(read("sort=cheapest-first").sort).toBeNull();
    expect(read("sort=price-asc").sort).toBe("price-asc");
  });

  it("значение вне словаря НЕ выбрасывается", () => {
    // Словари в product-specs.ts — про вкус, они пополняются без
    // миграции. В карте, залитой раньше, может стоять значение, которого
    // там уже нет; выбросив его здесь, мы сделали бы такую карту
    // ненаходимой её же собственной характеристикой.
    expect(read("mc=1.7.10").specs.mcVersions).toEqual(["1.7.10"]);
  });

  it("цена держится и как введено, и в центах", () => {
    const q = read("min=5&max=19,99");
    // minRaw возвращается в поле попапа — человек должен увидеть то, что
    // сам написал, а не приведённую форму.
    expect(q.minRaw).toBe("5");
    expect(q.minCents).toBe(500);
    expect(q.maxCents).toBe(1999);
  });

  it("чепуха в цене не считается границей", () => {
    const q = read("min=abc");
    expect(q.minCents).toBeNull();
  });
});

describe("activeFilterCount", () => {
  it("цена с двумя границами — одно условие, а не два", () => {
    // Человек задал один диапазон, а не два требования.
    expect(activeFilterCount(read("min=5&max=20"))).toBe(1);
    expect(activeFilterCount(read("min=5"))).toBe(1);
  });

  it("сортировка не считается условием", () => {
    // Она не прячет ни одной карты. Число на кнопке фильтров обещает
    // спрятанное — обещать его за перестановку было бы неправдой.
    expect(activeFilterCount(read("sort=newest"))).toBe(0);
  });

  it("каждое поле-набор считается один раз, сколько бы значений в нём ни было", () => {
    expect(activeFilterCount(read("mc=1.21,1.20,1.19"))).toBe(1);
    expect(activeFilterCount(read("mc=1.21&fmt=Schematic&min=5"))).toBe(3);
  });
});
