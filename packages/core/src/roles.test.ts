import { describe, expect, it } from "vitest";
import { guessRoles } from "./roles";
import type { BracketData, Position } from "./types";

const POS: Position[] = [1, 2, 3, 4, 5];

// rows[герой] = игры на позициях 1..5
function mk(rows: Record<number, number[]>): BracketData {
  const byPosition: BracketData["byPosition"] = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
  const overall: BracketData["overall"] = {};
  for (const [id, gs] of Object.entries(rows)) {
    const hero = Number(id);
    overall[hero] = { games: gs.reduce((a, b) => a + b, 0), wins: 0 };
    POS.forEach((p, i) => {
      if (gs[i] > 0) byPosition[p][hero] = { games: gs[i], wins: 0 };
    });
  }
  return { overall, byPosition, vs: {}, with: {} };
}

const data = mk({
  10: [9000, 200, 100, 0, 0], // керри
  20: [100, 9000, 500, 0, 0], // мид
  30: [200, 300, 8000, 1500, 0], // хардлейн
  40: [0, 0, 1500, 7000, 1500], // саппорт
  50: [0, 0, 0, 1000, 8000], // фулл-саппорт
  60: [0, 0, 100, 4000, 4000], // гибкий: 4 или 5
});

describe("guessRoles", () => {
  it("один герой: берёт самую частую позицию и уверен в ней", () => {
    const r = guessRoles(data, [10]);
    expect(r.assignment[10]).toBe(1);
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it("полная команда: раскладывает по позициям, разруливая гибкого героя", () => {
    const r = guessRoles(data, [60, 30, 10, 40, 20]);
    expect(r.assignment).toEqual({ 10: 1, 20: 2, 30: 3, 40: 4, 60: 5 });
  });

  it("гибкий герой один: уверенность низкая", () => {
    const r = guessRoles(data, [60]);
    expect(r.confidence).toBeLessThan(0.6);
  });

  it("вероятности позиций каждого героя в сумме дают 1", () => {
    const r = guessRoles(data, [10, 40, 60]);
    for (const h of [10, 40, 60]) {
      const sum = POS.reduce((s, p) => s + r.marginals[h][p], 0);
      expect(sum).toBeCloseTo(1, 8);
    }
  });

  it("известная позиция героя учитывается, остальные подстраиваются", () => {
    const r = guessRoles(data, [10, 20], { 10: 2 });
    expect(r.assignment[10]).toBe(2);
    expect(r.assignment[20]).not.toBe(2);
  });

  it("противоречивые заданные позиции не ломают расчёт", () => {
    const r = guessRoles(data, [10, 20], { 10: 2, 20: 2 });
    expect(new Set(Object.values(r.assignment)).size).toBe(2);
  });

  it("пустая команда", () => {
    const r = guessRoles(data, []);
    expect(r.assignment).toEqual({});
    expect(r.confidence).toBe(1);
  });
});