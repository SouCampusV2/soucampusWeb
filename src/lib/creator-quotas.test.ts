import { describe, it, expect } from "vitest";
import {
  MAX_PENDING_MAPS,
  MAX_MAP_STORAGE_BYTES,
  checkCreatorQuota,
} from "./creator-quotas";

const MB = 1024 * 1024;

describe("checkCreatorQuota", () => {
  it("пускает автора с запасом по обоим потолкам", () => {
    expect(
      checkCreatorQuota({ pendingMaps: 0, storedBytes: 0 }, 10 * MB, false)
    ).toBeNull();
  });

  it("пускает последнюю карту до потолка очереди", () => {
    expect(
      checkCreatorQuota(
        { pendingMaps: MAX_PENDING_MAPS - 1, storedBytes: 0 },
        MB,
        false
      )
    ).toBeNull();
  });

  it("отказывает, когда очередь автора полна", () => {
    const reason = checkCreatorQuota(
      { pendingMaps: MAX_PENDING_MAPS, storedBytes: 0 },
      MB,
      false
    );
    expect(reason).toMatch(/waiting for review/);
  });

  it("пускает файл, который ровно добивает объём", () => {
    expect(
      checkCreatorQuota(
        { pendingMaps: 0, storedBytes: MAX_MAP_STORAGE_BYTES - 5 * MB },
        5 * MB,
        false
      )
    ).toBeNull();
  });

  it("отказывает файлу, который не помещается, и называет остаток", () => {
    const reason = checkCreatorQuota(
      { pendingMaps: 0, storedBytes: MAX_MAP_STORAGE_BYTES - 5 * MB },
      6 * MB,
      false
    );
    expect(reason).toMatch(/left/);
  });

  it("не печатает отрицательный остаток, если объём уже превышен", () => {
    const reason = checkCreatorQuota(
      { pendingMaps: 0, storedBytes: MAX_MAP_STORAGE_BYTES + 50 * MB },
      MB,
      false
    );
    expect(reason).not.toMatch(/-\d/);
  });

  // Квоты придуманы против спама чужих авторов. Владелец грузит свои
  // карты пачками и упирался бы в них первым.
  it("не касается админа", () => {
    expect(
      checkCreatorQuota(
        { pendingMaps: 50, storedBytes: MAX_MAP_STORAGE_BYTES * 3 },
        15 * MB,
        true
      )
    ).toBeNull();
  });
});
