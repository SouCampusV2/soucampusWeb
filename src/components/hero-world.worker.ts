// Web Worker первого экрана: считает мир для HeroWorld вне основного потока.
// Получает зерно и размеры, отдаёт массивы пикселей передачей владения
// (transferable) — без копирования, буферы просто переезжают в страницу.
// Почему воркер, а не эффект, — в шапке src/lib/world-gen.ts.
import { clouds, heights, placeFlowers, stampFlowers, terrain } from "@/lib/world-gen";
import type { CellRect, FlowerStamp } from "@/lib/world-gen";

export type WorldRequest = {
  /** Номер запроса: ответ на устаревший (сменили зерно или размер окна) страница выбросит. */
  id: number;
  seed: number;
  cols: number;
  rows: number;
  skyCols: number;
  /** Цветы SouCampus: какой штамп (на узком экране меньше), сколько клеток видно в первом кадре и где в нём нельзя расти. */
  flowerStamp: FlowerStamp;
  screenCols: number;
  keepOut: CellRect[];
};

export type WorldResponse = WorldRequest & {
  land: Uint8ClampedArray<ArrayBuffer>;
  sky: Uint8ClampedArray<ArrayBuffer>;
  appearAt: Float32Array<ArrayBuffer>;
  done: number;
};

// Типов DedicatedWorkerGlobalScope в проекте нет (lib "webworker" не
// подключена ради одного файла); у Worker та же сигнатура postMessage.
const scope = self as unknown as Worker;

scope.onmessage = (event: MessageEvent<WorldRequest>) => {
  const request = event.data;
  const hmap = heights(request.seed, request.cols, request.rows);
  const land = terrain(request.seed, request.cols, request.rows, hmap);
  stampFlowers(
    land,
    request.cols,
    placeFlowers(request.seed, hmap, request.cols, request.rows, request.flowerStamp, request.screenCols, request.keepOut),
  );
  const sky = clouds(request.seed, request.skyCols, request.rows);
  const response: WorldResponse = {
    ...request,
    land,
    sky: sky.img,
    appearAt: sky.appearAt,
    done: sky.done,
  };
  scope.postMessage(response, [land.buffer, sky.img.buffer, sky.appearAt.buffer]);
};
