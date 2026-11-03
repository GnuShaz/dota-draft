import { describe, expect, it } from "vitest";
import { fillRoles, matchRole, uniqueRoles } from "./roleLabels";

describe("matchRole", () => {
  it("русские подписи из клиента", () => {
    expect(matchRole("Лёгкая")?.pos).toBe(1);
    expect(matchRole("Центр")?.pos).toBe(2);
    expect(matchRole("Сложная")?.pos).toBe(3);
    expect(matchRole("Поддержка")?.pos).toBe(4);
    expect(matchRole("Полная поддержка")?.pos).toBe(5);
  });

  it("значок и ник игрока в тексте не мешают", () => {
    expect(matchRole("СЕО секса[Г.Р.М]\n✓ Лёгкая")?.pos).toBe(1);
    expect(matchRole("q9fes[X.PIO]\n& Поддержка")?.pos).toBe(4);
    expect(matchRole("я Полная поддержка")?.pos).toBe(5);
  });

  it("терпит ошибки распознавания", () => {
    expect(matchRole("Цент")?.pos).toBe(2);
    expect(matchRole("Cложная")?.pos).toBe(3);
    expect(matchRole("Полная поддержа")?.pos).toBe(5);
    expect(matchRole("Легкая")?.pos).toBe(1);
  });

  it("«Поддержка» и «Полная поддержка» не путаются", () => {
    expect(matchRole("Поддержка")?.pos).toBe(4);
    expect(matchRole("Полная   поддержка")?.pos).toBe(5);
  });

  it("английские подписи", () => {
    expect(matchRole("Safe Lane")?.pos).toBe(1);
    expect(matchRole("Mid Lane")?.pos).toBe(2);
    expect(matchRole("Off Lane")?.pos).toBe(3);
    expect(matchRole("Soft Support")?.pos).toBe(4);
    expect(matchRole("Hard Support")?.pos).toBe(5);
  });

  it("не роль: ничего не возвращает", () => {
    expect(matchRole("q9fes[X.PIO]")).toBeUndefined();
    expect(matchRole("")).toBeUndefined();
  });
});

describe("uniqueRoles", () => {
  it("при повторе роль достаётся более уверенному слоту", () => {
    const r = uniqueRoles([
      { pos: 4, score: 0.7 },
      { pos: 4, score: 0.9 },
      undefined,
    ]);
    expect(r).toEqual([undefined, 4, undefined]);
  });
});

describe("fillRoles", () => {
  it("одна неизвестная роль определяется однозначно", () => {
    expect(fillRoles([1, undefined, 2, 3, 4])).toEqual([1, 5, 2, 3, 4]);
  });

  it("догадки по статистике занимают только свободные роли", () => {
    // Роль 1 уже прочитана у слота 0, поэтому догадка «1» для слота 1 игнорируется.
    expect(fillRoles([1, undefined, undefined, 3, 4], [undefined, 1, 5, undefined, undefined])).toEqual([
      1, 2, 5, 3, 4,
    ]);
  });
});