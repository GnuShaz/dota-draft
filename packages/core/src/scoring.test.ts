import { describe, expect, it } from "vitest";
import { recommend, shrink } from "./scoring";
import type { BracketData } from "./types";

const noPositions: BracketData["byPosition"] = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };

const data: BracketData = {
  overall: {
    1: { games: 20000, wins: 10000 }, // 50%
    2: { games: 20000, wins: 10400 }, // 52%
    3: { games: 20000, wins: 9600 }, // 48%
    4: { games: 8000, wins: 4400 }, // 55%
  },
  byPosition: {
    ...noPositions,
    1: {
      1: { games: 10000, wins: 5000 },
      2: { games: 10000, wins: 5200 },
      3: { games: 10000, wins: 4800 },
    },
    5: {
      4: { games: 8000, wins: 4400 },
      2: { games: 100, wins: 80 }, // слишком мало игр на позиции
    },
  },
  vs: {
    1: { 9: { games: 5000, wins: 3000 } }, // сильный контрпик на героя 9
    3: { 9: { games: 10, wins: 10 } }, // крошечная выборка, должна игнорироваться
  },
  with: {
    3: { 2: { games: 3000, wins: 1800 } }, // сильная синергия с героем 2
  },
};

describe("shrink", () => {
  it("без данных возвращает prior", () => {
    expect(shrink({ games: 0, wins: 0 }, 0.5, 100)).toBe(0.5);
  });
  it("на большой выборке почти равен сырому винрейту", () => {
    expect(shrink({ games: 1_000_000, wins: 600_000 }, 0.5, 200)).toBeCloseTo(0.6, 3);
  });
});

describe("recommend", () => {
  it("без пиков сортирует по винрейту на позиции", () => {
    const ids = recommend(data, 1, { allies: [], enemies: [] }).map((r) => r.heroId);
    expect(ids).toEqual([2, 1, 3]);
  });

  it("сильный контрпик поднимает героя наверх и объясняет почему", () => {
    const res = recommend(data, 1, { allies: [], enemies: [9] });
    expect(res[0]!.heroId).toBe(1);
    expect(res[0]!.reasons[0]).toMatchObject({ kind: "vs", heroId: 9 });
    expect(res[0]!.reasons[0]!.ppEffect).toBeGreaterThan(5);
  });

  it("игнорирует пары с малой выборкой", () => {
    const res = recommend(data, 1, { allies: [], enemies: [9] });
    const h3 = res.find((r) => r.heroId === 3)!;
    expect(h3.reasons).toHaveLength(0);
    expect(h3.winProb).toBeCloseTo(h3.baseWinProb, 10);
  });

  it("учитывает синергию с союзником", () => {
    const res = recommend(data, 1, { allies: [2], enemies: [] });
    const h3 = res.find((r) => r.heroId === 3)!;
    expect(h3.winProb).toBeGreaterThan(h3.baseWinProb);
    expect(h3.reasons[0]).toMatchObject({ kind: "with", heroId: 2 });
  });

  it("не предлагает уже выбранных героев", () => {
    const ids = recommend(data, 1, { allies: [], enemies: [1] }).map((r) => r.heroId);
    expect(ids).not.toContain(1);
  });

  it("отсеивает героев с малым числом игр на позиции", () => {
    const ids = recommend(data, 5, { allies: [], enemies: [] }).map((r) => r.heroId);
    expect(ids).toEqual([4]);
  });

  it("если на позиции нет данных, возвращает пустой список", () => {
    expect(recommend(data, 3, { allies: [], enemies: [] })).toEqual([]);
  });

  it("вклад пары меряется от общего винрейта, а не от позиционного", () => {
    const d: BracketData = {
      overall: { 5: { games: 20000, wins: 10000 } }, // 50% в целом
      byPosition: { ...noPositions, 1: { 5: { games: 10000, wins: 5500 } } }, // 55% на позиции
      vs: { 5: { 9: { games: 5000, wins: 2500 } } }, // 50% против героя 9: ровно как в целом
      with: {},
    };
    const res = recommend(d, 1, { allies: [], enemies: [9] });
    expect(res[0]!.reasons[0]!.delta).toBeCloseTo(0, 10);
    expect(res[0]!.winProb).toBeCloseTo(res[0]!.baseWinProb, 10);
  });

  it("baseWeight меняет баланс между мета-винрейтом и матчапами", () => {
    const d: BracketData = {
      overall: {
        1: { games: 20000, wins: 10000 },
        2: { games: 20000, wins: 10000 },
      },
      byPosition: {
        ...noPositions,
        1: { 1: { games: 10000, wins: 5600 }, 2: { games: 10000, wins: 5000 } },
      },
      vs: { 2: { 9: { games: 5000, wins: 2650 } } },
      with: {},
    };
    const input = { allies: [], enemies: [9] };
    expect(recommend(d, 1, input).map((r) => r.heroId)).toEqual([1, 2]);

    const low = recommend(d, 1, input, { baseWeight: 0.25 });
    expect(low.map((r) => r.heroId)).toEqual([2, 1]);

    const h1 = low.find((r) => r.heroId === 1)!;
    expect(h1.winProb).toBeCloseTo(h1.baseWinProb, 10); // winProb от baseWeight не зависит
  });

  it("отсеивает героев, которые почти не играются на этой позиции", () => {
    const d: BracketData = {
      overall: {
        1: { games: 20000, wins: 10000 },
        2: { games: 20000, wins: 10000 },
      },
      byPosition: {
        ...noPositions,
        1: {
          1: { games: 10000, wins: 5000 },
          2: { games: 800, wins: 400 }, // 4% всех игр героя
        },
      },
      vs: {},
      with: {},
    };
    const input = { allies: [], enemies: [] };
    expect(recommend(d, 1, input).map((r) => r.heroId)).toEqual([1]);
    expect(
      recommend(d, 1, input, { minPositionShare: 0 }).map((r) => r.heroId),
    ).toContain(2);
  });
});