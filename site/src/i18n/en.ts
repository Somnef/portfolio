/**
 * English UI strings. This file is the source of truth for the key set:
 * every other locale is typed against `UIStrings`, so a missing or misspelt
 * key in a translation is a build error rather than a blank space on the page.
 *
 * These are interface strings only. Content translations (timeline entries,
 * projects, posts) are optional per item and handled by the content layer.
 */
const en = {
  'site.title': 'Moncef Bousselat',
  'site.role': 'Cloud & DevOps Engineer',

  'nav.label': 'Main',
  'nav.home': 'Home',

  'skip.content': 'Skip to content',

  'lang.label': 'Language',
  'lang.current': 'Current language',

  'footer.sourceCode': 'Source code',
} as const;

export type UIStrings = Record<keyof typeof en, string>;
export type UIKey = keyof typeof en;

export default en;
