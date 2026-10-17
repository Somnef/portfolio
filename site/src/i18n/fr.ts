import type { UIStrings } from './en';

/**
 * French UI strings. Typed as `UIStrings`, so this object must cover every key
 * English defines - omitting one fails `astro check`.
 */
const fr: UIStrings = {
  'site.title': 'Moncef Bousselat',
  'site.role': 'Ingénieur Cloud & DevOps',

  'nav.label': 'Principal',
  'nav.home': 'Accueil',

  'skip.content': 'Aller au contenu',

  'lang.label': 'Langue',
  'lang.current': 'Langue actuelle',

  'footer.sourceCode': 'Code source',
};

export default fr;
