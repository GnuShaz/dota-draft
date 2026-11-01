import { describe, expect, it } from "vitest";
import { searchHeroes } from "./search";
import type { Hero } from "./search";

// Русские названия в тесте условные, проверяется логика поиска.
const h = (id: number, en: string, ru?: string): Hero => ({
  id,
  name: `npc_dota_hero_${id}`,
  localizedName: ru ?? en,
  en,
  ru,
});

const heroes = [
  h(1, "Anti-Mage", "Анти-Маг"),
  h(2, "Faceless Void", "Безликий Войд"),
  h(3, "Void Spirit", "Дух Пустоты"),
  h(4, "Pudge", "Пудж"),
  h(5, "Phantom Assassin", "Фантом Ассасин"),
  h(6, "Pangolier", "Панголир"),
];
const none = new Set<number>();
const names = (q: string, taken = none) => searchHeroes(heroes, q, taken).map((x) => x.en);

describe("searchHeroes", () => {
  it("русское сокращение «ам» находит Anti-Mage, а не Faceless Void", () => {
    const res = names("ам");
    expect(res[0]).toBe("Anti-Mage");
    expect(res).not.toContain("Faceless Void");
  });

  it("английское «am» тоже находит Anti-Mage первым", () => {
    expect(names("am")[0]).toBe("Anti-Mage");
  });

  it("название по русским буквам: «анти»", () => {
    expect(names("анти")[0]).toBe("Anti-Mage");
  });

  it("английское имя, набранное в русской раскладке, находится: «згвпу» это pudge", () => {
    expect(names("згвпу")[0]).toBe("Pudge");
  });

  it("точное сокращение выше совпадения по началу имени: «pa»", () => {
    expect(names("pa")[0]).toBe("Phantom Assassin");
  });

  it("«void» ставит Faceless Void выше Void Spirit", () => {
    expect(names("void").slice(0, 2)).toEqual(["Faceless Void", "Void Spirit"]);
  });

  it("не предлагает уже выбранных героев", () => {
    expect(names("pudge", new Set([4]))).toEqual([]);
  });
});