import { describe, it, expect } from "vitest";
import { footprintInPitches, rowToProject } from "./projects";

// Раньше здесь проверялась целостность массива в projects.ts (уникальные
// slug'и, непустые поля). Эту работу теперь делает сама база: not null на
// колонках и unique на slug — их физически нельзя нарушить.
//
// Осталось то, что база проверить не может: перевод строки из БД в форму,
// которой пользуется сайт. Это чистая функция без обращения к сети,
// поэтому тесты по-прежнему гоняются в CI без ключей и без интернета.

const row = {
  slug: "bluespawn",
  title: "BlueSpawn",
  tag: "Order",
  summary: "Короткий текст",
  description: "Длинный текст",
  image_url: "/portfolio/bluespawn.webp",
  price_label: "€150",
  size_label: "250×250",
  deadline_label: "1 week",
  size_x: 250,
  size_z: 250,
  price_amount: 150,
  is_featured: true,
  project_images: null,
};

describe("rowToProject", () => {
  it("переименовывает колонки БД в поля, которые ждут компоненты", () => {
    const project = rowToProject(row);

    expect(project.image).toBe("/portfolio/bluespawn.webp"); // image_url
    expect(project.price).toBe("€150"); // price_label
    expect(project.size).toBe("250×250"); // size_label
    expect(project.deadline).toBe("1 week"); // deadline_label
    expect(project.isFeatured).toBe(true); // is_featured
    expect(project.slug).toBe("bluespawn");
  });

  it("отдаёт gallery как undefined, когда фото нет", () => {
    // Компоненты написаны под проверку `project.gallery && length > 0` —
    // пустой массив вместо undefined тихо сломал бы это условие.
    expect(rowToProject(row).gallery).toBeUndefined();
    expect(rowToProject({ ...row, project_images: [] }).gallery).toBeUndefined();
  });

  it("сортирует галерею по position, а не по порядку ответа базы", () => {
    // Вложенный запрос не гарантирует порядок — фото могут приехать
    // как угодно, поэтому здесь они специально перепутаны.
    const project = rowToProject({
      ...row,
      project_images: [
        { url: "/третье.png", position: 2 },
        { url: "/первое.png", position: 0 },
        { url: "/второе.png", position: 1 },
      ],
    });

    expect(project.gallery).toEqual(["/первое.png", "/второе.png", "/третье.png"]);
  });
});

describe("footprintInPitches", () => {
  it("переводит площадь в футбольные поля (105×68 м)", () => {
    // 200×200 = 40 000 м² / 7 140 = 5.60…
    expect(footprintInPitches({ size: "200×200", sizeX: 200, sizeZ: 200 })).toBe(5.6);
    expect(footprintInPitches({ size: "75×75", sizeX: 75, sizeZ: 75 })).toBe(0.8);
    // Больше десяти — целыми: 2000×2000 = 560.2…
    expect(footprintInPitches({ size: "2000×2000", sizeX: 2000, sizeZ: 2000 })).toBe(560);
  });

  it("молчит, когда подпись размера — не простое N×M", () => {
    // Несколько островов по 150×150: площадь одного не площадь работы.
    expect(footprintInPitches({ size: "150×150 each", sizeX: 150, sizeZ: 150 })).toBeNull();
  });

  it("молчит без чисел", () => {
    expect(footprintInPitches({ size: "200×200", sizeX: null, sizeZ: 200 })).toBeNull();
  });
});
