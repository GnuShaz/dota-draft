import { describe, expect, it } from "vitest";
import {
  DESC_H,
  DESC_W,
  VIEWS,
  checkEmpty,
  makeRefs,
  matchSlot,
  normalize,
  readSlot,
  refViewsRaw,
  resolveSlots,
} from "./vision";
import type { Rect } from "./vision";

interface Img {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function lcg(seed: number) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function fill(img: Img, r: Rect, rgb: number[]) {
  for (let y = Math.floor(r.y); y < Math.min(img.height, Math.floor(r.y + r.h)); y++) {
    for (let x = Math.floor(r.x); x < Math.min(img.width, Math.floor(r.x + r.w)); x++) {
      const i = (y * img.width + x) * 4;
      img.data[i] = rgb[0];
      img.data[i + 1] = rgb[1];
      img.data[i + 2] = rgb[2];
      img.data[i + 3] = 255;
    }
  }
}

// Искусственный «портрет»: фон и шесть крупных цветных пятен, зависящих только от номера героя.
function portrait(id: number): Img {
  const img: Img = { width: 256, height: 144, data: new Uint8ClampedArray(256 * 144 * 4) };
  const rnd = lcg(id);
  fill(img, { x: 0, y: 0, w: 256, h: 144 }, [rnd() * 200 + 30, rnd() * 200 + 30, rnd() * 200 + 30]);
  for (let b = 0; b < 6; b++) {
    const w = 50 + rnd() * 90;
    const h = 30 + rnd() * 60;
    fill(img, { x: rnd() * (256 - w), y: rnd() * (144 - h), w, h }, [rnd() * 255, rnd() * 255, rnd() * 255]);
  }
  return img;
}

function blank(width: number, height: number, rgb = [40, 40, 40]): Img {
  const img: Img = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  fill(img, { x: 0, y: 0, w: width, h: height }, rgb);
  return img;
}

// Копирует часть src в прямоугольник dst, растягивая и меняя яркость.
function blit(dst: Img, src: Img, s: Rect, d: Rect, gain: number) {
  for (let y = 0; y < d.h; y++) {
    for (let x = 0; x < d.w; x++) {
      const sx = Math.min(src.width - 1, Math.floor(s.x + ((x + 0.5) / d.w) * s.w));
      const sy = Math.min(src.height - 1, Math.floor(s.y + ((y + 0.5) / d.h) * s.h));
      const si = (sy * src.width + sx) * 4;
      const di = ((d.y + y) * dst.width + d.x + x) * 4;
      for (let c = 0; c < 3; c++) dst.data[di + c] = src.data[si + c] * gain;
      dst.data[di + 3] = 255;
    }
  }
}

const ids = Array.from({ length: 12 }, (_, i) => i + 1);
const refs = makeRefs(ids.map((id) => ({ id, raw: refViewsRaw(portrait(id)) })));
const FULL: Rect = { x: 0, y: 0, w: 256, h: 144 };

describe("vision", () => {
  it("эталон героя занимает VIEWS видов по DESC_W x DESC_H x 3 байт", () => {
    expect(refViewsRaw(portrait(1)).length).toBe(VIEWS * DESC_W * DESC_H * 3);
  });

  it("плоская область нормализуется в нулевой вектор", () => {
    expect(normalize(new Float32Array(DESC_W * DESC_H * 3).fill(40)).every((x) => x === 0)).toBe(true);
  });

  it("узнаёт героев в слотах при обрезке, смещении рамки и другой яркости", () => {
    const shot = blank(700, 100);
    const slots = [
      { id: 3, crop: FULL },
      { id: 5, crop: { x: 256 * 0.09, y: 0, w: 256 * 0.82, h: 144 } },
      { id: 8, crop: { x: 256 * 0.17, y: 0, w: 256 * 0.66, h: 144 } },
      { id: 11, crop: { x: 256 * 0.09, y: 144 * 0.045, w: 256 * 0.82, h: 144 * 0.82 } },
    ];
    slots.forEach((s, i) =>
      blit(shot, portrait(s.id), s.crop, { x: 10 + i * 150, y: 10, w: 90, h: 55 }, 0.85),
    );
    slots.forEach((s, i) => {
      const res = matchSlot(shot, { x: 10 + i * 150 + 3, y: 12, w: 90, h: 55 }, refs);
      expect(res[0].id).toBe(s.id);
      expect(res[0].score).toBeGreaterThan(0.7);
    });
  });

  it("пустой плоский слот не похож ни на кого", () => {
    const res = matchSlot(blank(300, 100), { x: 10, y: 10, w: 90, h: 55 }, refs);
    expect(res[0].score).toBeLessThan(0.5);
  });

  it("серый силуэт считается пустым слотом, цветной портрет нет", () => {
    const grey = blank(300, 100, [110, 112, 115]);
    expect(checkEmpty(grey, { x: 10, y: 10, w: 90, h: 55 }).empty).toBe(true);
    const colored = blank(300, 100);
    blit(colored, portrait(4), FULL, { x: 10, y: 10, w: 90, h: 55 }, 1);
    expect(checkEmpty(colored, { x: 10, y: 10, w: 90, h: 55 }).empty).toBe(false);
  });

  it("readSlot: уверенно узнаёт героя, пустой слот не узнаёт", () => {
    const shot = blank(300, 100);
    blit(shot, portrait(7), FULL, { x: 10, y: 10, w: 90, h: 55 }, 1);
    const r = readSlot(shot, { x: 10, y: 10, w: 90, h: 55 }, refs);
    expect(r.empty).toBe(false);
    expect(r.candidates[0].id).toBe(7);
    expect(r.sure).toBe(true);

    const e = readSlot(blank(300, 100), { x: 10, y: 10, w: 90, h: 55 }, refs);
    expect(e.empty).toBe(true);
    expect(e.sure).toBe(false);
  });

  it("resolveSlots: один герой не занимает два слота", () => {
    const r = resolveSlots(
      [
        [{ id: 5, score: 0.9 }, { id: 7, score: 0.4 }],
        [{ id: 5, score: 0.8 }, { id: 6, score: 0.7 }],
        [{ id: 9, score: 0.3 }],
      ],
      0.5,
    );
    expect(r.map((x) => x?.id)).toEqual([5, 6, undefined]);
  });

  it("resolveSlots: ниже порога слот остаётся пустым", () => {
    const r = resolveSlots([[{ id: 1, score: 0.49 }]], 0.5);
    expect(r[0]).toBeUndefined();
  });
});