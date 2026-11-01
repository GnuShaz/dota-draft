import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Lang = "ru" | "en";

const ru = {
  docTitle: "Dota Draft: подбор героя по драфту",
  ranksLabel: "Ранг игроков",
  rankGroupHint: "Данные по двум соседним рангам объединены",
  posesLabel: "Ваша позиция",
  langLabel: "Язык интерфейса",
  yourTeam: "Ваша команда",
  enemies: "Враги",
  countOf: "{n} из {m}",
  you: "Вы",
  placeholderEnemy: "Просто печатайте героя для врагов: pudge, am, sf",
  placeholderAlly: "Просто печатайте героя для союзников: pudge, am, sf",
  searchAria: "Поиск героя",
  hint: "Начните печатать имя героя. Enter добавляет, Tab переключает команду, Backspace убирает последнего.",
  removeHero: "Убрать героя {name}",
  emptySlot: "Свободный слот, добавить героя",
  boardTitle: "{pos}: кого брать",
  balanceLeft: "Контрпики и связки",
  balanceRight: "Сила героя в мете",
  balanceAria: "Что важнее при выборе героя",
  loading: "Загружаю данные ранга…",
  noData: "Для этой роли в выбранном ранге мало данных. Попробуйте другую роль или ранг.",
  usually: "обычно {p}%",
  vsEnemies: "против врагов",
  withAllies: "с союзниками",
  detailRole: "{pos}, обычно выигрывает {p}% игр",
  bonusCaption: "к винрейту от драфта",
  emptyDraft:
    "Добавьте врагов и союзников, и здесь появится разбор: кого герой переигрывает и с кем играет лучше всего.",
  secVs: "Против врагов",
  secWith: "С союзниками",
  note: "Бонус складывается из эффектов выше, а проценты означают пункты винрейта: было 50%, стало 55%, это +5. Используйте его, чтобы сравнивать героев между собой. Это не шанс победы: чем больше героев в драфте, тем оптимистичнее сумма.",
  sample: "выборка: {n}",
  noDataShort: "нет данных",
  verdictNoDraft: "Драфта пока нет, поэтому герои идут по обычному винрейту на этой позиции.",
  verdictVs: "удобен против {n} из {m} врагов",
  verdictWith: "хорошо сочетается с {n} из {m} союзников",
  verdictHard: "Трудно против: {names}.",
  verdictPoorWith: "Плохо сочетается с: {names}.",
  effNoData: "Слишком мало игр, чтобы судить",
  effNone: "Почти не влияет",
  effVsPos: "Выигрывает у него чаще обычного",
  effVsNeg: "Проигрывает ему чаще обычного",
  effWithPos: "Вместе играют лучше обычного",
  effWithNeg: "Вместе играют хуже обычного",
  pos1: "Керри",
  pos2: "Мид",
  pos3: "Хардлейн",
  pos4: "Саппорт",
  pos5: "Фулл-саппорт",
  rank1: "Рекрут",
  rank2: "Страж",
  rank3: "Рыцарь",
  rank4: "Герой",
  rank5: "Легенда",
  rank6: "Властелин",
  rank7: "Божество",
  rank8: "Титан",
  rights: "Все права защищены.",
  privacy: "Политика конфиденциальности",
  terms: "Пользовательское соглашение",
  contact: "Связаться",
  trademark:
    "Dota 2 и связанные с ней названия, изображения и знаки принадлежат Valve Corporation. Проект не связан с Valve и не одобрен ею.",
  dataBy: "Статистика матчей:",
  back: "Назад к сервису",
  updated: "Редакция от {date}",
  legalNote: "",
};

export type Key = keyof typeof ru;

const en: Record<Key, string> = {
  docTitle: "Dota Draft: hero picks based on the draft",
  ranksLabel: "Player rank",
  rankGroupHint: "Data for two neighbouring ranks is combined",
  posesLabel: "Your position",
  langLabel: "Interface language",
  yourTeam: "Your team",
  enemies: "Enemies",
  countOf: "{n} of {m}",
  you: "You",
  placeholderEnemy: "Just type a hero for the enemy team: pudge, am, sf",
  placeholderAlly: "Just type a hero for your team: pudge, am, sf",
  searchAria: "Hero search",
  hint: "Start typing a hero name. Enter adds, Tab switches team, Backspace removes the last pick.",
  removeHero: "Remove {name}",
  emptySlot: "Empty slot, add a hero",
  boardTitle: "{pos}: who to pick",
  balanceLeft: "Counters and synergies",
  balanceRight: "Hero strength in the meta",
  balanceAria: "What matters more when choosing a hero",
  loading: "Loading rank data…",
  noData: "Not enough data for this role in the selected rank. Try another role or rank.",
  usually: "usually {p}%",
  vsEnemies: "against enemies",
  withAllies: "with allies",
  detailRole: "{pos}, usually wins {p}% of games",
  bonusCaption: "winrate bonus from the draft",
  emptyDraft:
    "Add enemies and allies and a breakdown will appear here: who this hero beats and who it plays best with.",
  secVs: "Against enemies",
  secWith: "With allies",
  note: "The bonus is the sum of the effects above, and percentages are winrate points: from 50% to 55% is +5. Use it to compare heroes with each other. It is not a chance to win: the more heroes in the draft, the more optimistic the sum.",
  sample: "sample: {n}",
  noDataShort: "no data",
  verdictNoDraft: "No draft yet, so heroes are ranked by their usual winrate in this position.",
  verdictVs: "strong against {n} of {m} enemies",
  verdictWith: "works well with {n} of {m} allies",
  verdictHard: "Struggles against: {names}.",
  verdictPoorWith: "Poor synergy with: {names}.",
  effNoData: "Too few games to tell",
  effNone: "Barely matters",
  effVsPos: "Wins against them more often than usual",
  effVsNeg: "Loses to them more often than usual",
  effWithPos: "They play better together than usual",
  effWithNeg: "They play worse together than usual",
  pos1: "Carry",
  pos2: "Mid",
  pos3: "Offlane",
  pos4: "Soft Support",
  pos5: "Hard Support",
  rank1: "Herald",
  rank2: "Guardian",
  rank3: "Crusader",
  rank4: "Archon",
  rank5: "Legend",
  rank6: "Ancient",
  rank7: "Divine",
  rank8: "Immortal",
  rights: "All rights reserved.",
  privacy: "Privacy Policy",
  terms: "Terms of Use",
  contact: "Contact",
  trademark:
    "Dota 2 and related names, images and marks are the property of Valve Corporation. This project is not affiliated with or endorsed by Valve.",
  dataBy: "Match statistics:",
  back: "Back to the app",
  updated: "Last updated: {date}",
  legalNote: "Courtesy translation. In case of discrepancy the Russian version prevails.",
};

const DICT: Record<Lang, Record<Key, string>> = { ru, en };

export type T = (key: Key, vars?: Record<string, string | number>) => string;

interface Value {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
}
const Ctx = createContext<Value | null>(null);

function detect(): Lang {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "ru" || saved === "en") return saved;
  } catch {
    // localStorage может быть недоступен (приватный режим), тогда берём язык браузера
  }
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {
      // не критично
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = DICT[lang].docTitle;
  }, [lang]);

  const t = useMemo<T>(
    () => (key, vars) =>
      DICT[lang][key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? `{${k}}`)),
    [lang],
  );

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n вне I18nProvider");
  return v;
}