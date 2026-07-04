// Набор шрифтов для «перебора» в чат-вордмарке (AI. LEGAL) и слоганах.
// Все — с поддержкой кириллицы (слоганы на русском) и латиницы (LEGAL). Self-hosted
// через next/font (без внешнего запроса к Google — важно для 152-ФЗ), preload:false —
// грузятся лениво, когда вордмарк реально рендерится, а не на старте страницы.
// ВАЖНО: next/font требует литеральные объекты-аргументы (без spread/переменных).

import {
  Oswald,
  Montserrat,
  PT_Serif,
  Playfair_Display,
  Yeseva_One,
  Pacifico,
  Caveat,
  Russo_One,
  Prata,
  Podkova,
  Ruslan_Display,
  Marck_Script,
  Unbounded,
  Rubik,
} from "next/font/google";

const oswald = Oswald({ subsets: ["latin", "cyrillic"], weight: ["600"], variable: "--sf-oswald", display: "swap", preload: false });
const montserrat = Montserrat({ subsets: ["latin", "cyrillic"], weight: ["800"], variable: "--sf-montserrat", display: "swap", preload: false });
const ptSerif = PT_Serif({ subsets: ["latin", "cyrillic"], weight: ["700"], variable: "--sf-ptserif", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin", "cyrillic"], weight: ["800"], variable: "--sf-playfair", display: "swap", preload: false });
const yeseva = Yeseva_One({ subsets: ["latin", "cyrillic"], weight: ["400"], variable: "--sf-yeseva", display: "swap", preload: false });
const pacifico = Pacifico({ subsets: ["latin", "cyrillic"], weight: ["400"], variable: "--sf-pacifico", display: "swap", preload: false });
const caveat = Caveat({ subsets: ["latin", "cyrillic"], weight: ["700"], variable: "--sf-caveat", display: "swap", preload: false });
const russo = Russo_One({ subsets: ["latin", "cyrillic"], weight: ["400"], variable: "--sf-russo", display: "swap", preload: false });
const prata = Prata({ subsets: ["latin", "cyrillic"], weight: ["400"], variable: "--sf-prata", display: "swap", preload: false });
const podkova = Podkova({ subsets: ["latin", "cyrillic"], weight: ["700"], variable: "--sf-podkova", display: "swap", preload: false });
const ruslan = Ruslan_Display({ subsets: ["latin", "cyrillic"], weight: ["400"], variable: "--sf-ruslan", display: "swap", preload: false });
const marck = Marck_Script({ subsets: ["latin", "cyrillic"], weight: ["400"], variable: "--sf-marck", display: "swap", preload: false });
const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], weight: ["800"], variable: "--sf-unbounded", display: "swap", preload: false });
const rubik = Rubik({ subsets: ["latin", "cyrillic"], weight: ["700"], variable: "--sf-rubik", display: "swap", preload: false });

const loaded = [
  oswald, montserrat, ptSerif, playfair, yeseva, pacifico, caveat,
  russo, prata, podkova, ruslan, marck, unbounded, rubik,
];

// Имена CSS-переменных (тот же порядок, что и loaded) — используются как fontFamily.
const FONT_VARS = [
  "--sf-oswald", "--sf-montserrat", "--sf-ptserif", "--sf-playfair", "--sf-yeseva",
  "--sf-pacifico", "--sf-caveat", "--sf-russo", "--sf-prata", "--sf-podkova",
  "--sf-ruslan", "--sf-marck", "--sf-unbounded", "--sf-rubik",
];

// classNames next/font — вешаем на <html> в layout.tsx (они и определяют --sf-* переменные).
export const shuffleFontVars = loaded.map((f) => f.variable).join(" ");

// Семейства для перебора: загруженные шрифты + системные generic'и (бесплатная вариативность).
export const SHUFFLE_FONTS: string[] = [
  ...FONT_VARS.map((v) => `var(${v})`),
  "Georgia, 'Times New Roman', serif",
  "ui-monospace, 'Courier New', monospace",
  "system-ui, sans-serif",
];
