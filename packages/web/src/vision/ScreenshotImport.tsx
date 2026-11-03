import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MIN_SCORE,
  fillRoles,
  guessRoles,
  matchRole,
  readSlot,
  resolveSlots,
  uniqueRoles,
} from "@dota-draft/core";
import type { BracketData, Position, Raster, RoleMatch, SlotRead } from "@dota-draft/core";
import { POSITION_IDS, positionName } from "../copy";
import { Portrait, searchHeroes } from "../heroes";
import type { Hero } from "../heroes";
import { useI18n } from "../i18n";
import type { Key } from "../i18n";
import { DEFAULT_LAYOUT, boxesOf, loadSettings, saveSettings } from "./bar";
import type { BarLayout, FracRect, Settings } from "./bar";
import { readText, stripToCanvas } from "./ocr";
import { loadRefs } from "./portraits";

export interface ImportResult {
  position: Position;
  allyByPos: Partial<Record<Position, number>>;
  enemies: number[];
}

type Side = "left" | "right";
type Phase = "idle" | "working" | "done";

interface Loaded {
  raster: Raster;
  url: string;
  w: number;
  h: number;
}
interface RoleInfo {
  side: Side;
  sideSure: boolean;
  roles: (Position | undefined)[];
  roleSure: boolean[];
  ocrOk: boolean;
}
interface Result extends RoleInfo {
  reads: SlotRead[];
  heroes: (number | undefined)[];
}

const BASE = import.meta.env.BASE_URL;
const SIDES: Record<Side, number[]> = { left: [0, 1, 2, 3, 4], right: [5, 6, 7, 8, 9] };
const otherSide = (s: Side): Side => (s === "left" ? "right" : "left");
const ROLES_NEEDED = 2; // столько подписей ролей должно найтись, чтобы считать сторону своей
const tick = () => new Promise((r) => setTimeout(r, 30));

const SLIDERS: { key: keyof BarLayout; label: Key; min: number; max: number; step: number }[] = [
  { key: "leftX", label: "layoutLeft", min: -0.05, max: 0.5, step: 0.001 },
  { key: "rightX", label: "layoutRight", min: 0.3, max: 1, step: 0.001 },
  { key: "step", label: "layoutStep", min: 0.04, max: 0.12, step: 0.0005 },
  { key: "w", label: "layoutWidth", min: 0.03, max: 0.12, step: 0.0005 },
  { key: "y", label: "layoutTop", min: -0.05, max: 0.8, step: 0.005 },
  { key: "h", label: "layoutHeight", min: 0.1, max: 0.95, step: 0.005 },
];

const px = (b: FracRect, im: Loaded) => ({ x: b.x * im.w, y: b.y * im.h, w: b.w * im.w, h: b.h * im.h });

async function readImage(file: Blob): Promise<Loaded> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bmp.width);
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas недоступен");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const data = ctx.getImageData(0, 0, w, h);
  return { raster: { width: w, height: h, data: data.data }, url: URL.createObjectURL(file), w, h };
}

/** Роли союзников: прочитанные с экрана, остальные по подсказке статистики и методом исключения. */
function computeRoles(
  side: Side,
  found: (RoleMatch | undefined)[],
  heroIds: (number | undefined)[],
  data: BracketData | undefined,
) {
  const slots = SIDES[side];
  const known = uniqueRoles(found.length > 0 ? found : slots.map(() => undefined));
  let preferred: (Position | undefined)[] = [];
  if (data && known.some((r) => r === undefined)) {
    const fixed: Record<number, Position> = {};
    const present: number[] = [];
    slots.forEach((slot, k) => {
      const id = heroIds[slot];
      if (id === undefined) return;
      present.push(id);
      const r = known[k];
      if (r !== undefined) fixed[id] = r;
    });
    if (present.length > 0) {
      const g = guessRoles(data, present, fixed);
      preferred = slots.map((slot) => {
        const id = heroIds[slot];
        return id === undefined ? undefined : g.assignment[id];
      });
    }
  }
  const filled = fillRoles(known, preferred);
  const roles: (Position | undefined)[] = Array.from({ length: 10 }, () => undefined);
  const roleSure: boolean[] = Array.from({ length: 10 }, () => false);
  slots.forEach((slot, k) => {
    roles[slot] = filled[k];
    roleSure[slot] = known[k] !== undefined;
  });
  return { roles, roleSure };
}

function HeroPicker({
  heroes,
  read,
  byId,
  onPick,
}: {
  heroes: Hero[];
  read: SlotRead;
  byId: Map<number, Hero>;
  onPick: (id: number | undefined) => void;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const found = useMemo(() => searchHeroes(heroes, q, new Set<number>(), 6), [heroes, q]);
  return (
    <div className="imp-picker">
        {q === "" && !read.empty && read.candidates.length > 0 && (
        <div className="imp-chips">
          {read.candidates.map((m) => {
            const h = byId.get(m.id);
            return (
              h && (
                <button key={m.id} type="button" className="imp-chip" onClick={() => onPick(m.id)}>
                  <Portrait hero={h} size="sm" />
                  <span>{h.localizedName}</span>
                  <em>{Math.round(m.score * 100)}%</em>
                </button>
              )
            );
          })}
        </div>
      )}
      <input
        autoFocus
        value={q}
        placeholder={t("impSearch")}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && found[0]) onPick(found[0].id);
        }}
      />
      {found.length > 0 && (
        <div className="imp-chips">
          {found.map((h) => (
            <button key={h.id} type="button" className="imp-chip" onClick={() => onPick(h.id)}>
              <Portrait hero={h} size="sm" />
              <span>{h.localizedName}</span>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="imp-link" onClick={() => onPick(undefined)}>
        {t("impClear")}
      </button>
    </div>
  );
}

export function ScreenshotImport({
  heroes,
  data,
  onApply,
}: {
  heroes: Hero[];
  data?: BracketData;
  onApply: (r: ImportResult) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState<Loaded>();
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState<Key>("impReadHeroes");
  const [err, setErr] = useState<Key>();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [res, setRes] = useState<Result>();
  const [meSlot, setMeSlot] = useState<number>();
  const [editing, setEditing] = useState<number>();
  const [roleEditing, setRoleEditing] = useState<number>();

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const dataRef = useRef(data);
  dataRef.current = data;
  const imgRef = useRef<Loaded | undefined>(undefined);
  const ocrCache = useRef(new Map<number, string>());

  const byId = useMemo(() => new Map(heroes.map((h): [number, Hero] => [h.id, h])), [heroes]);
  const boxes = useMemo(() => boxesOf(settings.layout), [settings.layout]);

  useEffect(() => saveSettings(settings), [settings]);

  // Читает подписи под пятью слотами одной стороны. Результат кэшируется по слотам.
  const readSide = useCallback(async (image: Loaded, side: Side): Promise<(RoleMatch | undefined)[]> => {
    const layout = settingsRef.current.layout;
    const all = boxesOf(layout);
    const out: (RoleMatch | undefined)[] = [];
    for (const slot of SIDES[side]) {
      let text = ocrCache.current.get(slot);
      if (text === undefined) {
        const b = all[slot];
        const cx = b.x + b.w / 2;
        const y0 = Math.min(0.9, b.y + b.h * 0.95);
        const canvas = stripToCanvas(image.raster, {
          x: (cx - layout.step / 2) * image.w,
          y: y0 * image.h,
          w: layout.step * image.w,
          h: (1 - y0) * image.h,
        });
        text = await readText(BASE, canvas);
        ocrCache.current.set(slot, text);
      }
      out.push(matchRole(text));
    }
    return out;
  }, []);

  const detectRoles = useCallback(
    async (image: Loaded, heroIds: (number | undefined)[], forced?: Side): Promise<RoleInfo> => {
      const saved = settingsRef.current.mySide;
      let side: Side = forced ?? saved;
      let sideSure = false;
      let found: (RoleMatch | undefined)[] = [];
      let ocrOk = true;
      try {
        const order: Side[] = forced ? [forced] : [saved, otherSide(saved)];
        for (const s of order) {
          const f = await readSide(image, s);
          const hits = f.filter((x) => x !== undefined).length;
          if (hits >= ROLES_NEEDED || forced) {
            side = s;
            found = f;
            sideSure = hits >= ROLES_NEEDED;
            break;
          }
        }
      } catch {
        ocrOk = false;
      }
      const { roles, roleSure } = computeRoles(side, found, heroIds, dataRef.current);
      return { side, sideSure, roles, roleSure, ocrOk };
    },
    [readSide],
  );

  const analyze = useCallback(
    async (image: Loaded) => {
      setPhase("working");
      setErr(undefined);
      setMeSlot(undefined);
      setEditing(undefined);
      setRoleEditing(undefined);
      ocrCache.current.clear();
      setMsg("impReadHeroes");
      await tick();
      const refs = await loadRefs(BASE);
      if (!refs) {
        setErr("importNoPortraits");
        setPhase("idle");
        return;
      }
      const slotBoxes = boxesOf(settingsRef.current.layout).map((b) => px(b, image));
      const reads = slotBoxes.map((b) => readSlot(image.raster, b, refs));
      const heroIds = resolveSlots(
        reads.map((r) => (r.empty ? [] : r.candidates)),
        MIN_SCORE,
      ).map((m) => m?.id);
      setMsg("impReadRoles");
      await tick();
      const info = await detectRoles(image, heroIds);
      if (info.sideSure) setSettings((s) => ({ ...s, mySide: info.side }));
      setRes({ reads, heroes: heroIds, ...info });
      setPhase("done");
    },
    [detectRoles],
  );

  const load = useCallback(
    async (file: Blob) => {
      setOpen(true);
      setPhase("working");
      setErr(undefined);
      try {
        const image = await readImage(file);
        if (imgRef.current) URL.revokeObjectURL(imgRef.current.url);
        imgRef.current = image;
        setImg(image);
        await analyze(image);
      } catch {
        setErr("importBadImage");
        setPhase("idle");
      }
    },
    [analyze],
  );

  // Ctrl+V с картинкой работает на любой странице сайта.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;
      e.preventDefault();
      void load(files[0]);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const setHero = (slot: number, id: number | undefined) => {
    setRes((r) =>
      r && {
        ...r,
        heroes: r.heroes.map((h, i) => (i === slot ? id : id !== undefined && h === id ? undefined : h)),
      },
    );
    setEditing(undefined);
  };

  const setRole = (slot: number, role: Position) => {
    setRes((r) => {
      if (!r) return r;
      const roles = [...r.roles];
      const roleSure = [...r.roleSure];
      const clash = SIDES[r.side].find((s) => s !== slot && roles[s] === role);
      if (clash !== undefined) {
        roles[clash] = roles[slot];
        roleSure[clash] = false;
      }
      roles[slot] = role;
      roleSure[slot] = true;
      return { ...r, roles, roleSure };
    });
    setRoleEditing(undefined);
  };

  const swapSides = async () => {
    if (!res || !img) return;
    setPhase("working");
    setMsg("impReadRoles");
    setMeSlot(undefined);
    setEditing(undefined);
    setRoleEditing(undefined);
    await tick();
    const info = await detectRoles(img, res.heroes, otherSide(res.side));
    setRes({ ...res, ...info });
    setPhase("done");
  };

  const apply = () => {
    if (!res || meSlot === undefined) return;
    const myRole = res.roles[meSlot];
    if (myRole === undefined) return;
    const used = new Set<number>();
    const allyByPos: Partial<Record<Position, number>> = {};
    for (const slot of SIDES[res.side]) {
      const role = res.roles[slot];
      const id = res.heroes[slot];
      if (slot === meSlot || role === undefined || id === undefined || used.has(id)) continue;
      allyByPos[role] = id;
      used.add(id);
    }
    const enemies: number[] = [];
    for (const slot of SIDES[otherSide(res.side)]) {
      const id = res.heroes[slot];
      if (id !== undefined && !used.has(id)) {
        enemies.push(id);
        used.add(id);
      }
    }
    onApply({ position: myRole, allyByPos, enemies });
    setOpen(false);
  };

  const renderCard = (slot: number, kind: "ally" | "enemy") => {
    if (!res) return null;
    const heroId = res.heroes[slot];
    const hero = heroId !== undefined ? byId.get(heroId) : undefined;
    const read = res.reads[slot];
    const top = read.candidates[0];
    const maybe = !hero && !read.empty && top && top.score >= 0.6 ? byId.get(top.id) : undefined;
    const isMe = kind === "ally" && meSlot === slot;
    const unsure = hero !== undefined && !read.sure;
    const role = res.roles[slot];
    const roleSure = res.roleSure[slot];
    return (
      <div key={slot} className={`imp-card ${kind} ${isMe ? "me" : ""} ${unsure ? "unsure" : ""}`}>
        <button
          type="button"
          className="imp-face"
          onClick={() =>
            kind === "ally"
              ? setMeSlot((p) => (p === slot ? undefined : slot))
              : setEditing((p) => (p === slot ? undefined : slot))
          }
        >
          {hero ? <Portrait hero={hero} size="fill" /> : <span className="imp-blank">{t("impNotPicked")}</span>}
          {isMe && <span className="imp-badge">{t("you")}</span>}
          {unsure && <span className="imp-q">?</span>}
        </button>
        <div className="imp-name">{hero ? hero.localizedName : "\u00a0"}</div>
        {kind === "ally" && role !== undefined && (
          <button
            type="button"
            className={`imp-role ${roleSure ? "" : "guess"}`}
            title={roleSure ? undefined : t("impRoleGuess")}
            onClick={() => setRoleEditing((p) => (p === slot ? undefined : slot))}
          >
            {positionName(t, role)}
            {roleSure ? "" : "?"}
          </button>
        )}
        {roleEditing === slot && (
          <div className="imp-roles">
            {POSITION_IDS.map((p) => (
              <button key={p} type="button" className={p === role ? "on" : ""} onClick={() => setRole(slot, p)}>
                {positionName(t, p)}
              </button>
            ))}
          </div>
        )}
        {maybe && editing !== slot && (
          <button type="button" className="imp-link" onClick={() => setHero(slot, maybe.id)}>
            {t("impMaybe", { name: maybe.localizedName })}
          </button>
        )}
        <button
          type="button"
          className="imp-link"
          onClick={() => setEditing((p) => (p === slot ? undefined : slot))}
        >
          {t("impChange")}
        </button>
        {editing === slot && <HeroPicker heroes={heroes} read={read} byId={byId} onPick={(id) => setHero(slot, id)} />}
      </div>
    );
  };

  const busy = phase === "working";
  const showResult = phase === "done" && res !== undefined && img !== undefined;
  const allySlots = res ? SIDES[res.side] : SIDES.left;
  const enemySlots = res ? SIDES[otherSide(res.side)] : SIDES.right;
  const allyOrder = res
    ? [...allySlots].sort((a, b) => (res.roles[a] ?? 9) - (res.roles[b] ?? 9))
    : allySlots;
  const myRole = res && meSlot !== undefined ? res.roles[meSlot] : undefined;
  const ocrLines = [...ocrCache.current.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([slot, text]) => `слот ${slot + 1}: текст ${JSON.stringify(text.trim())}`);
  const statLines = res
    ? res.reads.map((r, i) => {
        const top = r.candidates[0];
        const name = top ? (byId.get(top.id)?.localizedName ?? String(top.id)) : "нет";
        return `слот ${i + 1}: цветность ${r.chroma.toFixed(1)}, контраст ${r.contrast.toFixed(1)}, ${
          r.empty ? "ПУСТО" : "герой"
        }, лучший кандидат ${name}${top ? ` (${Math.round(top.score * 100)}%)` : ""}`;
      })
    : [];
  const debug = [...statLines, ...ocrLines].join("\n");
  const sideWord = res ? t(res.side === "left" ? "impLeft" : "impRight") : "";

  return (
    <>
      <button type="button" className="import-btn" onClick={() => setOpen(true)}>
        {t("importBtn")}
      </button>

      {open && (
        <div
          className="modal-back"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("importTitle")}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f && f.type.startsWith("image/")) void load(f);
            }}
          >
            <div className="modal-head">
              <h2>{t("importTitle")}</h2>
              <button type="button" className="x" onClick={() => setOpen(false)} aria-label={t("importClose")}>
                ×
              </button>
            </div>
            {err && <p className="err">{t(err)}</p>}

            {phase === "idle" && (
              <>
                <p className="how">{t("impHow")}</p>
                <div className="dropzone">
                  <span>{t("impDrop")}</span>
                  <label className="btn">
                    {t("importFile")}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void load(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </>
            )}

            {busy && <p className="imp-working">{t(msg)}</p>}

            {showResult && res && img && (
              <>
                <img className="imp-shot" src={img.url} alt="" draggable={false} />
                <p className="imp-side">
                  <span>
                    {res.sideSure
                      ? t("impTeamAuto", { side: sideWord })
                      : t("impTeamGuess", { side: sideWord })}
                  </span>
                  <button type="button" className="imp-link" onClick={() => void swapSides()}>
                    {t("impSwap")}
                  </button>
                </p>
                {!res.ocrOk && <p className="err">{t("impOcrFailed")}</p>}
                <p className={`imp-hint ${meSlot === undefined ? "need" : ""}`}>
                  {myRole === undefined ? t("impPickMe") : t("impMeIs", { pos: positionName(t, myRole) })}
                </p>

                <h3 className="step">{t("yourTeam")}</h3>
                <div className="imp-row">{allyOrder.map((s) => renderCard(s, "ally"))}</div>
                <h3 className="step">{t("enemies")}</h3>
                <div className="imp-row">{enemySlots.map((s) => renderCard(s, "enemy"))}</div>

                <div className="import-foot">
                  <button type="button" className="btn primary" disabled={meSlot === undefined} onClick={apply}>
                    {t("impApply")}
                  </button>
                  {meSlot === undefined && <span className="import-note">{t("impPickMe")}</span>}
                </div>

                <details className="imp-adjust">
                  <summary>{t("impAdjust")}</summary>
                  <p className="import-note">{t("importLayoutHint")}</p>
                  <div className="shot">
                    <img src={img.url} alt="" draggable={false} />
                    {boxes.map((b, i) => (
                      <span
                        key={i}
                        className={`frame ${SIDES[res.side].includes(i) ? "ally" : "enemy"}`}
                        style={{
                          left: `${b.x * 100}%`,
                          top: `${b.y * 100}%`,
                          width: `${b.w * 100}%`,
                          height: `${b.h * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="layout-grid">
                    {SLIDERS.map((s) => (
                      <label key={s.key}>
                        {t(s.label)}
                        <input
                          type="range"
                          min={s.min}
                          max={s.max}
                          step={s.step}
                          value={settings.layout[s.key]}
                          onChange={(e) =>
                            setSettings((st) => ({
                              ...st,
                              layout: { ...st.layout, [s.key]: Number(e.target.value) },
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="seg-row">
                    <button type="button" className="btn primary" onClick={() => void analyze(img)}>
                      {t("impRerun")}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setSettings((st) => ({ ...st, layout: DEFAULT_LAYOUT }))}
                    >
                      {t("layoutReset")}
                    </button>
                  </div>
                </details>

                <details className="imp-debug">
                  <summary>{t("impDebug")}</summary>
                  <pre>{debug || "—"}</pre>
                </details>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}