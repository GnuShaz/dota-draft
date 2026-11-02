import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { guessRoles, recommend } from "@dota-draft/core";
import type {
  Bracket,
  BracketData,
  HeroMeta,
  Position,
  Reason,
  Recommendation,
} from "@dota-draft/core";
import { Portrait, searchHeroes } from "./heroes";
import type { Hero } from "./heroes";
import { GROUPS, RankMedal } from "./ranks";
import { POSITION_IDS, effectText, fmt, positionName, summary, verdictText } from "./copy";
import { useI18n } from "./i18n";
import type { Key, Lang } from "./i18n";

type Tone = "ally" | "enemy";
type Target = "enemy" | Position;
type AllyMap = Partial<Record<Position, number>>;
interface RoleInfo {
  pos: Position;
  unsure: boolean;
  prob: number;
}

const MAX_ENEMIES = 5;
const SURE = 0.6; // ниже этой уверенности роль врага помечается знаком «?»
const BASE = import.meta.env.BASE_URL;
const LANGS: Lang[] = ["ru", "en"];

const nextEmptyAlly = (m: AllyMap, own: Position): Position | undefined =>
  POSITION_IDS.find((p) => p !== own && m[p] === undefined);

function Slot({
  hero,
  tone,
  active,
  emptyLabel,
  onClick,
}: {
  hero?: HeroMeta;
  tone: Tone;
  active?: boolean;
  emptyLabel: string;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={`slot ${tone} ${hero ? "filled" : ""} ${active ? "active" : ""}`}
      onClick={onClick}
      aria-label={hero ? t("removeHero", { name: hero.localizedName }) : emptyLabel}
    >
      <AnimatePresence initial={false}>
        {hero && (
          <motion.span
            key={hero.id}
            className="slot-art"
            initial={{ opacity: 0, scale: 1.18 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
          >
            <Portrait hero={hero} size="fill" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function YouSlot({ preview }: { preview?: HeroMeta }) {
  const { t } = useI18n();
  return (
    <div className="slot you">
      <AnimatePresence initial={false}>
        {preview && (
          <motion.span
            key={preview.id}
            className="slot-art"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Portrait hero={preview} size="fill" />
          </motion.span>
        )}
      </AnimatePresence>
      <span className="you-label">
        <b>{t("you")}</b>
      </span>
    </div>
  );
}

function Bar({ value, scale }: { value: number; scale: number }) {
  const w = Math.min(50, (Math.abs(value) / scale) * 50);
  const gain = value >= 0;
  return (
    <span className="bar" aria-hidden="true">
      <motion.span
        className={`fill ${gain ? "gain" : "loss"}`}
        style={gain ? { left: "50%", transformOrigin: "left" } : { right: "50%", transformOrigin: "right" }}
        initial={{ scaleX: 0, width: `${w}%` }}
        animate={{ scaleX: 1, width: `${w}%` }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      />
    </span>
  );
}

function EffectRow({
  hero,
  kind,
  reason,
  scale,
  role,
}: {
  hero: HeroMeta;
  kind: "vs" | "with";
  reason?: Reason;
  scale: number;
  role?: string;
}) {
  const { t, lang } = useI18n();
  const effect = reason?.ppEffect;
  return (
    <div className="effect">
      <Portrait hero={hero} size="sm" />
      <div>
        <span className="name">{hero.localizedName}</span>
        {role && <span className="rl">{role}</span>}
        <small>
          {effectText(t, kind, effect)}
          {reason
            ? ` (${t("sample", { n: reason.games.toLocaleString(lang === "ru" ? "ru-RU" : "en-US") })})`
            : ""}
        </small>
      </div>
      {effect === undefined ? <span /> : <Bar value={effect} scale={scale} />}
      <span className={`val ${effect === undefined ? "none" : effect >= 0 ? "gain" : "loss"}`}>
        {effect === undefined ? t("noDataShort") : `${fmt(effect)}%`}
      </span>
    </div>
  );
}

function Detail({
  rec,
  hero,
  position,
  enemies,
  allies,
  byId,
  roleLabel,
}: {
  rec: Recommendation;
  hero: HeroMeta;
  position: Position;
  enemies: number[];
  allies: number[];
  byId: Map<number, HeroMeta>;
  roleLabel: (id: number) => string | undefined;
}) {
  const { t } = useI18n();
  const nameOf = (id: number) => byId.get(id)?.localizedName ?? String(id);
  const bonus = (rec.winProb - rec.baseWinProb) * 100;
  const scale = Math.max(5, ...rec.reasons.map((x) => Math.abs(x.ppEffect)));

  const ordered = (ids: number[], kind: Reason["kind"]) =>
    ids
      .map((id) => ({ id, reason: rec.reasons.find((x) => x.kind === kind && x.heroId === id) }))
      .sort((a, b) => (b.reason?.ppEffect ?? -999) - (a.reason?.ppEffect ?? -999));

  const section = (title: string, kind: Reason["kind"], ids: number[]) =>
    ids.length > 0 && (
      <section>
        <h3>{title}</h3>
        {ordered(ids, kind).map(({ id, reason }) => {
          const h = byId.get(id);
          return (
            h && (
              <EffectRow key={id} hero={h} kind={kind} reason={reason} scale={scale} role={roleLabel(id)} />
            )
          );
        })}
      </section>
    );

  return (
    <motion.div
      key={rec.heroId}
      className="detail"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
    >
      <div className="detail-head">
        <Portrait hero={hero} size="xl" />
        <div>
          <h2>{hero.localizedName}</h2>
          <p className="sub">
            {t("detailRole", {
              pos: positionName(t, position),
              p: (rec.baseWinProb * 100).toFixed(1),
            })}
          </p>
        </div>
        {enemies.length + allies.length > 0 && (
          <div className="bonus">
            <strong className={bonus >= 0 ? "gain" : "loss"}>{fmt(bonus)}%</strong>
            <span>{t("bonusCaption")}</span>
          </div>
        )}
      </div>

      <p className="lead">{verdictText(t, rec, enemies.length, allies.length, nameOf)}</p>

      {enemies.length + allies.length === 0 ? (
        <p className="empty">{t("emptyDraft")}</p>
      ) : (
        <>
          {section(t("secVs"), "vs", enemies)}
          {section(t("secWith"), "with", allies)}
          <p className="note">{t("note")}</p>
        </>
      )}
    </motion.div>
  );
}

export function App() {
  const { t, lang, setLang } = useI18n();
  const [meta, setMeta] = useState<{ heroes: HeroMeta[] }>();
  const [bracket, setBracket] = useState<Bracket>("legend_ancient");
  const [data, setData] = useState<BracketData>();
  const [position, setPosition] = useState<Position>(1);
  const [allyByPos, setAllyByPos] = useState<AllyMap>({});
  const [enemies, setEnemies] = useState<number[]>([]);
  const [target, setTarget] = useState<Target>("enemy");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [baseWeight, setBaseWeight] = useState(0.7);
  const [selectedId, setSelectedId] = useState<number>();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${BASE}data/meta.json`).then((r) => r.json()).then(setMeta);
  }, []);

  useEffect(() => {
    let stale = false;
    fetch(`${BASE}data/${bracket}.json`)
      .then((r) => r.json())
      .then((d) => {
        if (!stale) setData(d);
      });
    return () => {
      stale = true;
    };
  }, [bracket]);

  useEffect(() => setCursor(0), [query]);

  // Печатайте где угодно: первая буква переводит фокус в поле поиска и попадает в него.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || e.key === " ") return;
      const el = document.activeElement as HTMLElement | null;
      if (el === input.current) return;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el?.isContentEditable
      ) {
        return;
      }
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const heroes = useMemo<Hero[]>(
    () => (meta?.heroes ?? []).map((h) => ({ ...h, en: h.localizedName })),
    [meta],
  );
  const byId = useMemo(
    () => new Map(heroes.map((h): [number, HeroMeta] => [h.id, h])),
    [heroes],
  );

  const allies = useMemo(
    () =>
      POSITION_IDS.flatMap((p) => {
        const id = allyByPos[p];
        return p !== position && id !== undefined ? [id] : [];
      }),
    [allyByPos, position],
  );
  const taken = useMemo(() => new Set([...allies, ...enemies]), [allies, enemies]);
  const results = useMemo(() => searchHeroes(heroes, query, taken), [heroes, query, taken]);

  // Роли врагов: самая правдоподобная расстановка по статистике героев.
  const guess = useMemo(() => (data ? guessRoles(data, enemies) : undefined), [data, enemies]);
  const enemyByPos = useMemo(() => {
    const m: AllyMap = {};
    enemies.forEach((id, i) => {
      const pos = guess?.assignment[id] ?? POSITION_IDS[i];
      if (pos !== undefined) m[pos] = id;
    });
    return m;
  }, [enemies, guess]);

  const roles = useMemo(() => {
    const m = new Map<number, RoleInfo>();
    for (const p of POSITION_IDS) {
      const id = allyByPos[p];
      if (id !== undefined && p !== position) m.set(id, { pos: p, unsure: false, prob: 1 });
    }
    if (guess) {
      for (const id of enemies) {
        const pos = guess.assignment[id];
        if (pos === undefined) continue;
        const prob = guess.marginals[id]?.[pos] ?? 0;
        m.set(id, { pos, unsure: prob < SURE, prob });
      }
    }
    return m;
  }, [allyByPos, position, enemies, guess]);

  const roleLabel = (id: number) => {
    const r = roles.get(id);
    return r ? `${positionName(t, r.pos)}${r.unsure ? "?" : ""}` : undefined;
  };

  const rows = useMemo(
    () =>
      data
        ? recommend(data, position, { allies, enemies }, { baseWeight, limit: 12 })
        : [],
    [data, position, allies, enemies, baseWeight],
  );
  const selected = rows.find((r) => r.heroId === selectedId) ?? rows[0];
  const selectedHero = selected ? byId.get(selected.heroId) : undefined;

  const focusInput = () => input.current?.focus();

  const changePosition = (p: Position) => {
    if (p === position) return;
    // Если на новой позиции уже стоял союзник, он переезжает на освободившуюся.
    setAllyByPos((prev) => {
      const next = { ...prev };
      const moved = next[p];
      delete next[p];
      if (moved !== undefined) next[position] = moved;
      return next;
    });
    setTarget((prev) => (prev === p ? position : prev));
    setPosition(p);
  };

  const focusTeam = (tone: Tone) => {
    if (tone === "enemy") setTarget("enemy");
    else {
      setTarget(
        nextEmptyAlly(allyByPos, position) ?? (POSITION_IDS.find((p) => p !== position) as Position),
      );
    }
    focusInput();
  };

  const pick = (id: number) => {
    if (target === "enemy") {
      if (enemies.length >= MAX_ENEMIES) return;
      const next = [...enemies, id];
      setEnemies(next);
      if (next.length >= MAX_ENEMIES) {
        const a = nextEmptyAlly(allyByPos, position);
        if (a !== undefined) setTarget(a);
      }
    } else {
      const filled: AllyMap = { ...allyByPos, [target]: id };
      setAllyByPos(filled);
      const a = nextEmptyAlly(filled, position);
      if (a !== undefined) setTarget(a);
      else if (enemies.length < MAX_ENEMIES) setTarget("enemy");
    }
    setQuery("");
    focusInput();
  };

  const removeAlly = (p: Position) => {
    setAllyByPos((prev) => {
      const next = { ...prev };
      delete next[p];
      return next;
    });
    setTarget(p);
    focusInput();
  };
  const removeEnemy = (id: number) => {
    setEnemies((prev) => prev.filter((x) => x !== id));
    setTarget("enemy");
    focusInput();
  };

  const nEnemies = enemies.length;
  const nAllies = allies.length;
  const hasDraft = nEnemies + nAllies > 0;
  const tone: Tone = target === "enemy" ? "enemy" : "ally";

  return (
    <MotionConfig reducedMotion="user">
      <header className="top">
        <h1 className="wordmark">Dota Draft</h1>

        <div className="ranks" role="group" aria-label={t("ranksLabel")}>
          {GROUPS.map((g) => {
            const label = g.ranks.map((r) => t(`rank${r.tier}` as Key)).join("–");
            return (
              <button
                key={g.id}
                type="button"
                className={`rank-group ${g.id === bracket ? "on" : ""}`}
                aria-pressed={g.id === bracket}
                title={t("rankGroupHint")}
                onClick={() => setBracket(g.id)}
              >
                <span className="medals">
                  {g.ranks.map((r) => (
                    <RankMedal key={r.id} rank={r} label={t(`rank${r.tier}` as Key)} />
                  ))}
                </span>
                <small>{label}</small>
              </button>
            );
          })}
        </div>

        <div className="poses" role="group" aria-label={t("posesLabel")}>
          {POSITION_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`pos ${id === position ? "on" : ""}`}
              aria-pressed={id === position}
              onClick={() => changePosition(id)}
            >
              <b>{id}</b>
              {positionName(t, id)}
            </button>
          ))}
        </div>

        <div className="lang" role="group" aria-label={t("langLabel")}>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              className={l === lang ? "on" : ""}
              aria-pressed={l === lang}
              onClick={() => setLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <section className="draft">
        <div className="side ally">
          <button
            type="button"
            className={`side-title ${target !== "enemy" ? "on" : ""}`}
            onClick={() => focusTeam("ally")}
          >
            {t("yourTeam")} <span>{t("countOf", { n: nAllies + 1, m: 5 })}</span>
          </button>
          <div className="slots">
            {POSITION_IDS.map((p) => {
              if (p === position) {
                return (
                  <div className="cell" key={p}>
                    <YouSlot preview={selectedHero} />
                    <span className="role-tag">{positionName(t, p)}</span>
                  </div>
                );
              }
              const hero = byId.get(allyByPos[p] ?? -1);
              return (
                <div className="cell" key={p}>
                  <Slot
                    hero={hero}
                    tone="ally"
                    active={target === p}
                    emptyLabel={t("slotAlly", { pos: positionName(t, p) })}
                    onClick={() => {
                      if (hero) removeAlly(p);
                      else {
                        setTarget(p);
                        focusInput();
                      }
                    }}
                  />
                  <span className="role-tag">{positionName(t, p)}</span>
                </div>
              );
            })}
          </div>
          <p className="strip-note">{t("allyRolesNote")}</p>
        </div>

        <div className={`finder ${tone}`}>
          <div className="field">
            <input
              ref={input}
              autoFocus
              value={query}
              placeholder={
                target === "enemy"
                  ? t("placeholderEnemy")
                  : t("placeholderAllySlot", { pos: positionName(t, target) })
              }
              aria-label={t("searchAria")}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[cursor]) pick(results[cursor].id);
                else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setCursor((c) => Math.min(c + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setCursor((c) => Math.max(c - 1, 0));
                } else if (e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  focusTeam(target === "enemy" ? "ally" : "enemy");
                } else if (e.key === "Escape") setQuery("");
                else if (e.key === "Backspace" && !query) {
                  if (target === "enemy") {
                    const last = enemies[enemies.length - 1];
                    if (last !== undefined) removeEnemy(last);
                  } else if (allyByPos[target] !== undefined) {
                    removeAlly(target);
                  }
                }
              }}
            />
            {results.length > 0 && (
              <ul className="results">
                {results.map((h, i) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className={i === cursor ? "cur" : ""}
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => pick(h.id)}
                    >
                      <Portrait hero={h} size="sm" />
                      {h.localizedName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="hint">{t("hintRoles")}</p>
        </div>

        <div className="side enemy">
          <button
            type="button"
            className={`side-title ${target === "enemy" ? "on" : ""}`}
            onClick={() => focusTeam("enemy")}
          >
            {t("enemies")} <span>{t("countOf", { n: nEnemies, m: MAX_ENEMIES })}</span>
          </button>
          <div className="slots">
            {POSITION_IDS.map((p) => {
              const id = enemyByPos[p];
              const hero = id !== undefined ? byId.get(id) : undefined;
              const info = id !== undefined ? roles.get(id) : undefined;
              return (
                <div className="cell" key={p}>
                  <Slot
                    hero={hero}
                    tone="enemy"
                    emptyLabel={t("emptySlot")}
                    onClick={() => (hero ? removeEnemy(hero.id) : focusTeam("enemy"))}
                  />
                  <span
                    className={`role-tag ${info?.unsure ? "unsure" : ""}`}
                    title={info ? t("roleSure", { p: Math.round(info.prob * 100) }) : undefined}
                  >
                    {positionName(t, p)}
                    {info?.unsure ? "?" : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="strip-note">{t("enemyRolesNote")}</p>
        </div>
      </section>

      <div className="stage">
        <section className="board">
          <div className="board-head">
            <h2>{t("boardTitle", { pos: positionName(t, position) })}</h2>
            <label className="balance">
              <span>{t("balanceLeft")}</span>
              <input
                type="range"
                min={0.2}
                max={1.2}
                step={0.1}
                value={baseWeight}
                aria-label={t("balanceAria")}
                onChange={(e) => setBaseWeight(Number(e.target.value))}
              />
              <span>{t("balanceRight")}</span>
            </label>
          </div>

          {!data && <p className="empty">{t("loading")}</p>}
          {data && rows.length === 0 && <p className="empty">{t("noData")}</p>}

          <ul className="rows">
            <AnimatePresence mode="popLayout" initial={false}>
              {rows.map((r) => {
                const h = byId.get(r.heroId);
                if (!h) return null;
                const s = summary(r);
                const d = (r.winProb - r.baseWinProb) * 100;
                return (
                  <motion.li
                    key={r.heroId}
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 42 }}
                  >
                    <button
                      type="button"
                      className={`row ${selected?.heroId === r.heroId ? "active" : ""}`}
                      onClick={() => setSelectedId(r.heroId)}
                    >
                      <Portrait hero={h} size="lg" />
                      <span className="who">
                        <b>{h.localizedName}</b>
                        <small>{t("usually", { p: (r.baseWinProb * 100).toFixed(1) })}</small>
                      </span>
                      <span className="fit">
                        {nEnemies > 0 && (
                          <span>
                            {t("vsEnemies")} <b>{t("countOf", { n: s.vsGood, m: nEnemies })}</b>
                          </span>
                        )}
                        {nAllies > 0 && (
                          <span>
                            {t("withAllies")} <b>{t("countOf", { n: s.wiGood, m: nAllies })}</b>
                          </span>
                        )}
                      </span>
                      {hasDraft ? (
                        <span className={`score ${d >= 0 ? "gain" : "loss"}`}>{fmt(d)}%</span>
                      ) : (
                        <span />
                      )}
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </section>

        <aside className="detail-wrap">
          <AnimatePresence mode="wait" initial={false}>
            {selected && selectedHero && (
              <Detail
                key={selected.heroId}
                rec={selected}
                hero={selectedHero}
                position={position}
                enemies={enemies}
                allies={allies}
                byId={byId}
                roleLabel={roleLabel}
              />
            )}
          </AnimatePresence>
        </aside>
      </div>
    </MotionConfig>
  );
}