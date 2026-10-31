import type { Position, Recommendation } from "@dota-draft/core";

export const POSITIONS: { id: Position; name: string }[] = [
  { id: 1, name: "Керри" },
  { id: 2, name: "Мид" },
  { id: 3, name: "Хардлейн" },
  { id: 4, name: "Саппорт" },
  { id: 5, name: "Фулл-саппорт" },
];

export function positionName(p: Position): string {
  return POSITIONS.find((x) => x.id === p)?.name ?? `Позиция ${p}`;
}

export const fmt = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`;

// Эффект меньше этого порога (в процентах винрейта) считаем незаметным.
export const NOTICEABLE = 0.5;

export function summary(r: Recommendation) {
  const vs = r.reasons.filter((x) => x.kind === "vs");
  const wi = r.reasons.filter((x) => x.kind === "with");
  return {
    vsGood: vs.filter((x) => x.ppEffect >= NOTICEABLE).length,
    wiGood: wi.filter((x) => x.ppEffect >= NOTICEABLE).length,
    vsBad: vs.filter((x) => x.ppEffect <= -NOTICEABLE),
    wiBad: wi.filter((x) => x.ppEffect <= -NOTICEABLE),
  };
}

export function verdictText(
  r: Recommendation,
  enemies: number,
  allies: number,
  nameOf: (id: number) => string,
): string {
  if (enemies + allies === 0) {
    return "Драфта пока нет, поэтому герои идут по обычному винрейту на этой позиции.";
  }
  const s = summary(r);
  const parts: string[] = [];
  if (enemies > 0) parts.push(`удобен против ${s.vsGood} из ${enemies} врагов`);
  if (allies > 0) parts.push(`хорошо сочетается с ${s.wiGood} из ${allies} союзников`);
  const joined = parts.join(", ");
  let text = joined.charAt(0).toUpperCase() + joined.slice(1) + ".";
  if (s.vsBad.length) text += ` Трудно против: ${s.vsBad.map((x) => nameOf(x.heroId)).join(", ")}.`;
  if (s.wiBad.length) text += ` Плохо сочетается с: ${s.wiBad.map((x) => nameOf(x.heroId)).join(", ")}.`;
  return text;
}

export function effectText(kind: "vs" | "with", effect: number | undefined): string {
  if (effect === undefined) return "Слишком мало игр, чтобы судить";
  if (Math.abs(effect) < NOTICEABLE) return "Почти не влияет";
  if (kind === "vs") return effect > 0 ? "Выигрывает у него чаще обычного" : "Проигрывает ему чаще обычного";
  return effect > 0 ? "Вместе играют лучше обычного" : "Вместе играют хуже обычного";
}