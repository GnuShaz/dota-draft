import { describe, expect, it } from "vitest";
import { EMPTY_CHROMA, checkEmpty } from "./vision";
import type { Rect } from "./vision";

interface Img {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function paint(img: Img, r: Rect, rgb: number[]) {
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

function solid(width: number, height: number, rgb: number[]): Img {
  const img: Img = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  paint(img, { x: 0, y: 0, w: width, h: height }, rgb);
  return img;
}

const BOX: Rect = { x: 10, y: 10, w: 90, h: 55 };

describe("checkEmpty", () => {
  it("голубовато-серая панель с бледным силуэтом героя: слот пуст", () => {
    const img = solid(300, 100, [58, 64, 74]);
    paint(img, { x: 35, y: 20, w: 40, h: 22 }, [98, 104, 114]);
    expect(checkEmpty(img, BOX).empty).toBe(true);
  });

  it("тёмный герой с цветным свечением не принимается за пустой слот", () => {
    const img = solid(300, 100, [10, 12, 16]);
    paint(img, { x: 40, y: 22, w: 30, h: 14 }, [20, 150, 170]);
    expect(checkEmpty(img, BOX).empty).toBe(false);
  });

  it("порог цветности: чуть ниже слот пуст, чуть выше нет", () => {
    expect(checkEmpty(solid(300, 100, [60, 60, 60 + EMPTY_CHROMA - 2]), BOX).empty).toBe(true);
    expect(checkEmpty(solid(300, 100, [60, 60, 60 + EMPTY_CHROMA + 2]), BOX).empty).toBe(false);
  });

  it("возвращает цветность и контраст для отладки", () => {
    const r = checkEmpty(solid(300, 100, [60, 60, 80]), BOX);
    expect(r.chroma).toBeCloseTo(20, 5);
    expect(r.contrast).toBeCloseTo(0, 5);
  });
});