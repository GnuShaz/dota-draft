import type { Position, Recommendation } from "@dota-draft/core";
import type { Key, T } from "./i18n";

export const POSITION_IDS: Position[] = [1, 2, 3, 4, 5];

export const positionName = (t: T, p: Position): string => t(`pos${p}` as Key);

export const fmt = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`;

// Эффект меньше этого порога (в пунктах винрейта) считаем незаметным.
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
  t: T,
  r: Recommendation,
  enemies: number,
  allies: number,
  nameOf: (id: number) => string,
): string {
  if (enemies + allies === 0) return t("verdictNoDraft");
  const s = summary(r);
  const parts: string[] = [];
  if (enemies > 0) parts.push(t("verdictVs", { n: s.vsGood, m: enemies }));
  if (allies > 0) parts.push(t("verdictWith", { n: s.wiGood, m: allies }));
  const joined = parts.join(", ");
  const out = [joined.charAt(0).toUpperCase() + joined.slice(1) + "."];
  if (s.vsBad.length) out.push(t("verdictHard", { names: s.vsBad.map((x) => nameOf(x.heroId)).join(", ") }));
  if (s.wiBad.length) out.push(t("verdictPoorWith", { names: s.wiBad.map((x) => nameOf(x.heroId)).join(", ") }));
  return out.join(" ");
}

export function effectText(t: T, kind: "vs" | "with", effect: number | undefined): string {
  if (effect === undefined) return t("effNoData");
  if (Math.abs(effect) < NOTICEABLE) return t("effNone");
  if (kind === "vs") return effect > 0 ? t("effVsPos") : t("effVsNeg");
  return effect > 0 ? t("effWithPos") : t("effWithNeg");
}