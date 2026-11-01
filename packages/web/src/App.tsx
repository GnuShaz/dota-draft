import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { recommend } from "@dota-draft/core";
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

type Team = "ally" | "enemy";
const MAX: Record<Team, number> = { ally: 4, enemy: 5 };
const other = (t: Team): Team => (t === "enemy" ? "ally" : "enemy");
const LANGS: Lang[] = ["ru", "en"];
const BASE = import.meta.env.BASE_URL;

function Slot({ hero, tone, onClick }: { hero?: HeroMeta; tone: Team; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={`slot ${tone} ${hero ? "filled" : ""}`}
      onClick={onClick}
      aria-label={hero ? t("removeHero", { name: hero.localizedName }) : t("emptySlot")}
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

function YouSlot({ preview, role }: { preview?: HeroMeta; role: string }) {
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
        <small>{role}</small>
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
}: {
  hero: HeroMeta;
  kind: "vs" | "with";
  reason?: Reason;
  scale: number;
}) {
  const { t, lang } = useI18n();
  const effect = reason?.ppEffect;
  return (
    <div className="effect">
      <Portrait hero={hero} size="sm" />
      <div>
        <span className="name">{hero.localizedName}</span>
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
}: {
  rec: Recommendation;
  hero: HeroMeta;
  position: Position;
  enemies: number[];
  allies: number[];
  byId: Map<number, HeroMeta>;
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
          return h && <EffectRow key={id} hero={h} kind={kind} reason={reason} scale={scale} />;
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
  const [picks, setPicks] = useState<Record<Team, number[]>>({ ally: [], enemy: [] });
  const [team, setTeam] = useState<Team>("enemy");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [baseWeight, setBaseWeight] = useState(0.7);
  const [selectedId, setSelectedId] = useState<number>();
  const input = useRef<HTMLInputElement>(null);

  const [ruNames, setRuNames] = useState<Record<string, string>>({});

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
  const taken = useMemo(() => new Set([...picks.ally, ...picks.enemy]), [picks]);
  const results = useMemo(() => searchHeroes(heroes, query, taken), [heroes, query, taken]);

  const rows = useMemo(
    () =>
      data
        ? recommend(data, position, { allies: picks.ally, enemies: picks.enemy }, { baseWeight, limit: 12 })
        : [],
    [data, position, picks, baseWeight],
  );
  const selected = rows.find((r) => r.heroId === selectedId) ?? rows[0];
  const selectedHero = selected ? byId.get(selected.heroId) : undefined;

  const pick = (id: number) => {
    if (picks[team].length >= MAX[team]) return;
    const next = { ...picks, [team]: [...picks[team], id] };
    setPicks(next);
    if (next[team].length >= MAX[team] && next[other(team)].length < MAX[other(team)]) {
      setTeam(other(team));
    }
    setQuery("");
    input.current?.focus();
  };
  const unpick = (tm: Team, id: number) =>
    setPicks((p) => ({ ...p, [tm]: p[tm].filter((x) => x !== id) }));
  const focusTeam = (tm: Team) => {
    setTeam(tm);
    input.current?.focus();
  };

  const renderSlots = (tm: Team) =>
    Array.from({ length: MAX[tm] }, (_, i) => {
      const hero = byId.get(picks[tm][i] ?? -1);
      return (
        <Slot
          key={i}
          hero={hero}
          tone={tm}
          onClick={() => (hero ? unpick(tm, hero.id) : focusTeam(tm))}
        />
      );
    });

  const nEnemies = picks.enemy.length;
  const nAllies = picks.ally.length;
  const hasDraft = nEnemies + nAllies > 0;

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
              onClick={() => setPosition(id)}
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
            className={`side-title ${team === "ally" ? "on" : ""}`}
            onClick={() => focusTeam("ally")}
          >
            {t("yourTeam")} <span>{t("countOf", { n: nAllies, m: MAX.ally })}</span>
          </button>
          <div className="slots">
            {renderSlots("ally")}
            <YouSlot preview={selectedHero} role={positionName(t, position)} />
          </div>
        </div>

        <div className={`finder ${team}`}>
          <div className="field">
            <input
              ref={input}
              autoFocus
              value={query}
              placeholder={team === "enemy" ? t("placeholderEnemy") : t("placeholderAlly")}
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
                  setTeam(other(team));
                } else if (e.key === "Escape") setQuery("");
                else if (e.key === "Backspace" && !query && picks[team].length) {
                  unpick(team, picks[team][picks[team].length - 1] ?? -1);
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
          <p className="hint">{t("hint")}</p>
        </div>

        <div className="side enemy">
          <button
            type="button"
            className={`side-title ${team === "enemy" ? "on" : ""}`}
            onClick={() => focusTeam("enemy")}
          >
            {t("enemies")} <span>{t("countOf", { n: nEnemies, m: MAX.enemy })}</span>
          </button>
          <div className="slots">{renderSlots("enemy")}</div>
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
                enemies={picks.enemy}
                allies={picks.ally}
                byId={byId}
              />
            )}
          </AnimatePresence>
        </aside>
      </div>
    </MotionConfig>
  );
}