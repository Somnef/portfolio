import { getCollection, type CollectionEntry } from 'astro:content';
import { defaultLang, languages, type Lang } from '../i18n';

/**
 * Content query helpers.
 *
 * Entry ids are `<locale>/<slug>` because the collections use per-locale
 * folders. Pages should never parse an id themselves - everything goes through
 * here, so the locale-fallback rule lives in exactly one place.
 */

export type LocalizedCollection = 'timeline' | 'projects' | 'writing';

/** `en/slb-cloud-developer` -> `{ locale: 'en', slug: 'slb-cloud-developer' }` */
export function splitEntryId(id: string): { locale: Lang; slug: string } {
  const [first, ...rest] = id.split('/');

  if (first && first in languages && rest.length > 0) {
    return { locale: first as Lang, slug: rest.join('/') };
  }

  // A file outside a locale folder is a content mistake, not something to
  // paper over: treat it as the default locale so the build surfaces it.
  return { locale: defaultLang, slug: id };
}

/** The canonical reference id for a slug, which is always the English one. */
export function canonicalId(slug: string): string {
  return `${defaultLang}/${slug}`;
}

/**
 * Drafts are visible while developing and absent from production builds.
 * Only the writing collection has a draft flag; the others always pass.
 */
function isPublished<T extends { data: object }>(entry: T): boolean {
  if (!import.meta.env.PROD) return true;
  // Only the writing collection declares `draft`; the others have no such
  // field, so this reads it defensively rather than narrowing the entry type.
  return (entry.data as { draft?: boolean }).draft !== true;
}

export type Localized<C extends LocalizedCollection> = {
  entry: CollectionEntry<C>;
  slug: string;
  /** True when this is the English entry standing in for a missing translation. */
  isFallback: boolean;
};

/**
 * Every entry of a collection for one locale, with English standing in where a
 * translation is missing.
 *
 * A missing translation must never 404 and must never be hidden - the reader
 * gets the English text at the translated URL plus a notice, which the caller
 * renders from `isFallback`.
 */
export async function getLocalized<C extends LocalizedCollection>(
  collection: C,
  locale: Lang,
): Promise<Localized<C>[]> {
  const all = (await getCollection(collection)).filter(isPublished);

  const translated = new Map<string, CollectionEntry<C>>();
  const fallback = new Map<string, CollectionEntry<C>>();

  for (const entry of all) {
    const { locale: entryLocale, slug } = splitEntryId(entry.id);
    if (entryLocale === locale) translated.set(slug, entry);
    else if (entryLocale === defaultLang) fallback.set(slug, entry);
  }

  // Union of slugs, so an entry that exists only in the default locale is
  // still listed for every other locale.
  const slugs = new Set([...translated.keys(), ...fallback.keys()]);

  return [...slugs].flatMap((slug) => {
    const entry = translated.get(slug) ?? fallback.get(slug);
    if (!entry) return [];
    return [{ entry, slug, isFallback: !translated.has(slug) }];
  });
}

/** One entry by slug for a locale, with the same English fallback rule. */
export async function getLocalizedEntry<C extends LocalizedCollection>(
  collection: C,
  locale: Lang,
  slug: string,
): Promise<Localized<C> | undefined> {
  const entries = await getLocalized(collection, locale);
  return entries.find((e) => e.slug === slug);
}

/**
 * Resolve a reference() id (always canonical English) to the reader's locale.
 * Returns undefined when the target is a production-excluded draft, so callers
 * can drop the link rather than render a dead one.
 */
export async function resolveReference<C extends LocalizedCollection>(
  collection: C,
  locale: Lang,
  referencedId: string,
): Promise<Localized<C> | undefined> {
  const { slug } = splitEntryId(referencedId);
  return getLocalizedEntry(collection, locale, slug);
}

/** Newest first, with `order` as the tie-break. */
export function byDateDesc<C extends 'timeline' | 'projects' | 'writing'>(
  a: Localized<C>,
  b: Localized<C>,
): number {
  const dateOf = (e: Localized<C>): number => {
    const d = e.entry.data as { startDate?: Date; date?: Date; pubDate?: Date };
    return (d.startDate ?? d.date ?? d.pubDate ?? new Date(0)).getTime();
  };

  const diff = dateOf(b) - dateOf(a);
  if (diff !== 0) return diff;

  const orderOf = (e: Localized<C>): number => (e.entry.data as { order?: number }).order ?? 0;

  return orderOf(a) - orderOf(b);
}

/**
 * Reading time in whole minutes, derived from the raw body rather than a
 * remark plugin - that keeps it independent of which Markdown processor the
 * site uses. Code fences are stripped: nobody reads them at prose speed.
 */
export function readingTimeMinutes(body: string | undefined): number {
  if (!body) return 1;

  const prose = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');

  const words = prose.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
