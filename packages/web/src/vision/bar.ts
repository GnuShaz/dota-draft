/** Все значения в долях картинки: x, w, step по ширине, y, h по высоте. */
export interface BarLayout {
  y: number;
  h: number;
  w: number;
  step: number;
  leftX: number;
  rightX: number;
}
export interface FracRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Settings {
  layout: BarLayout;
  mySide: "left" | "right";
}

// Прикинуто по скриншоту узкой полосы с пиками. Подгоняется вручную и запоминается.
export const DEFAULT_LAYOUT: BarLayout = {
  y: 0.03,
  h: 0.55,
  w: 0.082,
  step: 0.0855,
  leftX: 0.005,
  rightX: 0.572,
};

const KEY = "vision.v2";

export function loadSettings(): Settings {
  const fallback: Settings = { layout: DEFAULT_LAYOUT, mySide: "left" };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const s = JSON.parse(raw) as Partial<Settings>;
    return {
      layout: { ...DEFAULT_LAYOUT, ...(s.layout ?? {}) },
      mySide: s.mySide === "right" ? "right" : "left",
    };
  } catch {
    return fallback;
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // не критично
  }
}

/** Десять рамок: сначала пять слева направо в левой группе, потом пять в правой. */
export function boxesOf(l: BarLayout): FracRect[] {
  const boxes: FracRect[] = [];
  for (let i = 0; i < 5; i++) boxes.push({ x: l.leftX + i * l.step, y: l.y, w: l.w, h: l.h });
  for (let i = 0; i < 5; i++) boxes.push({ x: l.rightX + i * l.step, y: l.y, w: l.w, h: l.h });
  return boxes;
}