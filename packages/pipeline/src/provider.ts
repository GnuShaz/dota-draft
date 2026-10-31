import type { Bracket, BracketData, HeroMeta } from "@dota-draft/core";

export interface DataProvider {
  name: string;
  /** Индексы недель, вошедших в снапшот. */
  resolveWeeks(): Promise<number[]>;
  fetchHeroes(): Promise<HeroMeta[]>;
  fetchBracket(bracket: Bracket): Promise<BracketData>;
}