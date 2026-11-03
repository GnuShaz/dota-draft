import type { Raster } from "@dota-draft/core";

type OcrWorker = Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>;

const TIMEOUT_MS = 40_000;
let workerPromise: Promise<OcrWorker> | undefined;

const abs = (path: string) => new URL(path, location.origin).href;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("ocr timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Один рабочий процесс на все картинки. Файлы лежат на самом сайте (папка ocr), внешних запросов нет. */
export function getOcrWorker(base: string): Promise<OcrWorker> {
  if (!workerPromise) {
    const p = withTimeout(
      (async () => {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker(["rus", "eng"], 1, {
          workerPath: abs(`${base}ocr/worker.min.js`),
          corePath: abs(`${base}ocr`),
          langPath: abs(`${base}ocr/lang`),
          gzip: false,
        });
        // Режим «один блок текста»: подпись состоит из одной-двух строк.
        await worker.setParameters({ tessedit_pageseg_mode: "6" as never });
        return worker;
      })(),
      TIMEOUT_MS,
    );
    workerPromise = p;
    p.catch(() => {
      workerPromise = undefined; // дадим попробовать ещё раз
    });
  }
  return workerPromise;
}

/**
 * Вырезает полосу из картинки, увеличивает, переводит в оттенки серого, растягивает контраст
 * и инвертирует: светлый текст на тёмном фоне превращается в тёмный на светлом, так его читает лучше.
 */
export function stripToCanvas(
  src: Raster,
  rect: { x: number; y: number; w: number; h: number },
  scale = 3,
): HTMLCanvasElement {
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const w = Math.max(1, Math.min(src.width - x0, Math.round(rect.w)));
  const h = Math.max(1, Math.min(src.height - y0, Math.round(rect.h)));

  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const sctx = small.getContext("2d");
  if (!sctx) throw new Error("canvas недоступен");
  const img = sctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y0 + y) * src.width + (x0 + x)) * 4;
      const di = (y * w + x) * 4;
      img.data[di] = src.data[si];
      img.data[di + 1] = src.data[si + 1];
      img.data[di + 2] = src.data[si + 2];
      img.data[di + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);

  const out = document.createElement("canvas");
  out.width = w * scale;
  out.height = h * scale;
  const ctx = out.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas недоступен");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, out.width, out.height);

  const px = ctx.getImageData(0, 0, out.width, out.height);
  const d = px.data;
  let lo = 255;
  let hi = 0;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = l;
    if (l < lo) lo = l;
    if (l > hi) hi = l;
  }
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = 255 - ((d[i] - lo) / range) * 255;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(px, 0, 0);
  return out;
}

export async function readText(base: string, canvas: HTMLCanvasElement): Promise<string> {
  const worker = await getOcrWorker(base);
  const { data } = await worker.recognize(canvas);
  return data.text;
}