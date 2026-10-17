import en, { type UIKey, type UIStrings } from './en';
import fr from './fr';

/** Display names are written in their own language, never translated. */
export const languages = {
  en: 'English',
  fr: 'Français',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'en';

const dictionaries: Record<Lang, UIStrings> = { en, fr };

/** Narrow an unknown string (e.g. Astro.currentLocale) to a supported Lang. */
export function toLang(value: string | undefined): Lang {
  return value && value in languages ? (value as Lang) : defaultLang;
}

/** Look up UI strings for a locale. Keys are checked at compile time. */
export function useTranslations(lang: Lang) {
  const dict = dictionaries[lang];
  return (key: UIKey): string => dict[key];
}

/**
 * The current path with any locale prefix removed, so the language switcher
 * can rebuild it for another locale and stay on the same page.
 */
export function pathWithoutLocale(url: URL): string {
  const segments = url.pathname.split('/').filter(Boolean);
  const [first, ...rest] = segments;

  if (first && first in languages) {
    return rest.length > 0 ? `/${rest.join('/')}/` : '/';
  }

  return url.pathname;
}

/** Month and year only - what a timeline needs, rather than an exact day. */
export function formatMonthYear(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang, {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

/** Dates rendered in the reader's locale rather than a fixed format. */
export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
