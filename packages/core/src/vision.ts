export interface Raster {
  width: number;
  height: number;
  /** RGBA, по 4 байта на пиксель. */
  data: ArrayLike<number>;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface RefView {
  id: number;
  v: Float32Array;
}
export interface Match {
  id: number;
  score: number;
}

/** Версия формата эталонов: при смене алгоритма увеличивайте, старый portraits.json перестанет подходить. */
export const DESC_VERSION = 2;
export const DESC_W = 28;
export const DESC_H = 14;
export const VIEWS = 4;
const VIEW_SIZE = DESC_W * DESC_H * 3;
const FLAT_RMS = 4; // область с меньшим разбросом яркости считаем плоской

export const MIN_SCORE = 0.5; // ниже: герой сам не подставляется
export const SURE_SCORE = 0.6; // ниже: помечаем «?»
export const SURE_MARGIN = 0.05; // разрыв с вторым кандидатом меньше: помечаем «?»
export const EMPTY_CHROMA = 24; // средняя цветность (макс. минус мин. канал, 0..255) ниже: слот пуст

// Часть слота, по которой узнаём героя: без скошенных краёв, цветных полос сверху и плашки ранга снизу.
const FACE = { x: 0.12, y: 0.06, w: 0.76, h: 0.54 };
export function face(r: Rect): Rect {
  return { x: r.x + r.w * FACE.x, y: r.y + r.h * FACE.y, w: r.w * FACE.w, h: r.h * FACE.h };
}

// Центр слота для проверки «слот пуст»: ещё уже, чтобы в него не попадали цветные полосы по краям.
const CORE = { x: 0.15, y: 0.15, w: 0.7, h: 0.45 };
function core(r: Rect): Rect {
  return { x: r.x + r.w * CORE.x, y: r.y + r.h * CORE.y, w: r.w * CORE.w, h: r.h * CORE.h };
}

// Какие доли (ширина, высота) портрета попадают в «виды»: слот в игре показывает его не целиком.
const VIEW_CROPS: [number, number][] = [
  [1, 1],
  [0.82, 1],
  [0.66, 1],
  [0.82, 0.82],
];

const clampInt = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(v)));

/** Уменьшает прямоугольник до DESC_W x DESC_H, усредняя цвета. Выходит за картинку: берётся край. */
export function sampleRaw(src: Raster, r: Rect): Float32Array {
  const out = new Float32Array(VIEW_SIZE);
  const cw = r.w / DESC_W;
  const ch = r.h / DESC_H;
  const nx = Math.max(1, Math.min(4, Math.ceil(cw)));
  const ny = Math.max(1, Math.min(4, Math.ceil(ch)));
  const n = nx * ny;
  for (let oy = 0; oy < DESC_H; oy++) {
    for (let ox = 0; ox < DESC_W; ox++) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      for (let iy = 0; iy < ny; iy++) {
        const sy = clampInt(r.y + (oy + (iy + 0.5) / ny) * ch, 0, src.height - 1);
        for (let ix = 0; ix < nx; ix++) {
          const sx = clampInt(r.x + (ox + (ix + 0.5) / nx) * cw, 0, src.width - 1);
          const i = (sy * src.width + sx) * 4;
          sr += src.data[i];
          sg += src.data[i + 1];
          sb += src.data[i + 2];
        }
      }
      const o = (oy * DESC_W + ox) * 3;
      out[o] = sr / n;
      out[o + 1] = sg / n;
      out[o + 2] = sb / n;
    }
  }
  return out;
}

/** Вычитает среднее и делит на длину: сравнение по косинусу не зависит от яркости и контраста. */
export function normalize(v: Float32Array): Float32Array {
  let mean = 0;
  for (const x of v) mean += x;
  mean /= v.length;
  const out = new Float32Array(v.length);
  let sq = 0;
  for (let i = 0; i < v.length; i++) {
    const d = v[i] - mean;
    out[i] = d;
    sq += d * d;
  }
  if (Math.sqrt(sq / v.length) < FLAT_RMS) return new Float32Array(v.length); // плоская область
  const norm = Math.sqrt(sq);
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

/** Эталон героя: VIEWS уменьшенных «лиц» портрета подряд, по байту на канал. */
export function refViewsRaw(src: Raster): Uint8Array {
  const out = new Uint8Array(VIEWS * VIEW_SIZE);
  VIEW_CROPS.forEach(([fw, fh], i) => {
    const w = src.width * fw;
    const h = src.height * fh;
    const s = sampleRaw(src, face({ x: (src.width - w) / 2, y: (src.height - h) / 4, w, h }));
    for (let k = 0; k < VIEW_SIZE; k++) out[i * VIEW_SIZE + k] = Math.round(s[k]);
  });
  return out;
}

export function makeRefs(list: { id: number; raw: Uint8Array }[]): RefView[] {
  const out: RefView[] = [];
  for (const { id, raw } of list) {
    for (let i = 0; i < VIEWS; i++) {
      const slice = Float32Array.from(raw.subarray(i * VIEW_SIZE, (i + 1) * VIEW_SIZE));
      out.push({ id, v: normalize(slice) });
    }
  }
  return out;
}

export interface MatchOptions {
  shifts?: number[]; // доли размера рамки
  scales?: number[];
  top?: number;
}

/** Лучшие кандидаты для одной рамки: по каждому герою берётся лучшее совпадение среди видов и сдвигов. */
export function matchSlot(
  src: Raster,
  box: Rect,
  refs: RefView[],
  opts: MatchOptions = {},
): Match[] {
  const shifts = opts.shifts ?? [-0.08, -0.04, 0, 0.04, 0.08];
  const scales = opts.scales ?? [0.94, 1, 1.06];
  const top = opts.top ?? 3;
  const best = new Map<number, number>();
  for (const s of scales) {
    for (const dy of shifts) {
      for (const dx of shifts) {
        const w = box.w * s;
        const h = box.h * s;
        const d = normalize(
          sampleRaw(
            src,
            face({
              x: box.x + (box.w - w) / 2 + dx * box.w,
              y: box.y + (box.h - h) / 2 + dy * box.h,
              w,
              h,
            }),
          ),
        );
        for (const ref of refs) {
          let dot = 0;
          const rv = ref.v;
          for (let i = 0; i < d.length; i++) dot += d[i] * rv[i];
          if (dot > (best.get(ref.id) ?? -2)) best.set(ref.id, dot);
        }
      }
    }
  }
  return [...best]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}

export interface Emptiness {
  empty: boolean;
  /** Средняя цветность центра слота, 0..255. */
  chroma: number;
  /** Разброс яркости в центре слота (для отладки). */
  contrast: number;
}

/**
 * Слот ещё не выбран: вместо портрета серая панель, а у тиммейта на ней бледный силуэт героя,
 * на которого он навёл курсор. Цвета там почти нет, поэтому героя в таком слоте не угадываем.
 */
export function checkEmpty(src: Raster, box: Rect): Emptiness {
  const s = sampleRaw(src, core(box));
  const n = DESC_W * DESC_H;
  let chroma = 0;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const r = s[i * 3];
    const g = s[i * 3 + 1];
    const b = s[i * 3 + 2];
    chroma += Math.max(r, g, b) - Math.min(r, g, b);
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    sum += l;
    sumSq += l * l;
  }
  chroma /= n;
  const mean = sum / n;
  const contrast = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
  return { empty: chroma < EMPTY_CHROMA, chroma, contrast };
}

export interface SlotRead {
  candidates: Match[];
  empty: boolean;
  /** Уверенность: первый кандидат достаточно сильный и явно лучше второго. */
  sure: boolean;
  chroma: number;
  contrast: number;
}

export function readSlot(src: Raster, box: Rect, refs: RefView[], opts?: MatchOptions): SlotRead {
  const { empty, chroma, contrast } = checkEmpty(src, box);
  const candidates = matchSlot(src, box, refs, opts);
  const [a, b] = candidates;
  const sure =
    !empty && a !== undefined && a.score >= SURE_SCORE && (b === undefined || a.score - b.score >= SURE_MARGIN);
  return { candidates, empty, sure, chroma, contrast };
}

/** Раздаёт героев слотам: один герой в одном слоте, побеждает более уверенное совпадение. */
export function resolveSlots(candidates: Match[][], minScore = MIN_SCORE): (Match | undefined)[] {
  const pairs: { slot: number; m: Match }[] = [];
  candidates.forEach((list, slot) =>
    list.forEach((m) => {
      if (m.score >= minScore) pairs.push({ slot, m });
    }),
  );
  pairs.sort((a, b) => b.m.score - a.m.score);
  const out: (Match | undefined)[] = candidates.map(() => undefined);
  const used = new Set<number>();
  for (const { slot, m } of pairs) {
    if (out[slot] || used.has(m.id)) continue;
    out[slot] = m;
    used.add(m.id);
  }
  return out;
}