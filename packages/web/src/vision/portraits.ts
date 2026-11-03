import { DESC_H, DESC_VERSION, DESC_W, VIEWS, makeRefs } from "@dota-draft/core";
import type { RefView } from "@dota-draft/core";

let cache: Promise<RefView[] | null> | undefined;

function decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Эталоны героев для распознавания. null, если файла нет или он собран другой версией алгоритма. */
export function loadRefs(base: string): Promise<RefView[] | null> {
  cache ??= (async () => {
    try {
      const r = await fetch(`${base}data/portraits.json`);
      if (!r.ok) return null;
      const j = (await r.json()) as {
        ver?: number;
        w: number;
        h: number;
        views: number;
        heroes: Record<string, string>;
      };
      if (j.ver !== DESC_VERSION || j.w !== DESC_W || j.h !== DESC_H || j.views !== VIEWS) return null;
      return makeRefs(Object.entries(j.heroes).map(([id, b64]) => ({ id: Number(id), raw: decode(b64) })));
    } catch {
      return null;
    }
  })();
  return cache;
}