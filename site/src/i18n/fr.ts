import type { UIStrings } from './en';

/**
 * French UI strings. Typed as `UIStrings`, so this object must cover every key
 * English defines - omitting one fails `astro check`.
 */
const fr: UIStrings = {
  'site.title': 'Moncef Bousselat',
  'site.role': 'Ingénieur Cloud & DevOps',

  'site.tagline':
    'Je conçois et exploite des infrastructures cloud au quotidien, et je collectionne les projets personnels le reste du temps.',

  'nav.label': 'Principal',
  'nav.home': 'Accueil',
  'nav.journey': 'Parcours',
  'nav.projects': 'Projets',

  'hero.cta.journey': 'Voir le parcours',
  'hero.cta.projects': 'Voir les projets',

  'journey.heading': 'Parcours',
  'journey.intro':
    'Postes, diplômes et certifications, du plus récent au plus ancien. Ouvrez une entrée pour le détail.',
  'journey.ongoing': "Aujourd'hui",
  'journey.relatedProjects': 'Projets associés',
  'journey.kind.work': 'Expérience',
  'journey.kind.education': 'Formation',
  'journey.kind.certification': 'Certification',
  'journey.kind.other': 'Autre',
  'journey.credential': 'Voir la certification',

  'projects.heading': 'Projets',
  'projects.intro':
    "Les travaux d'infrastructure d'abord. Les projets data et machine learning plus anciens sont regroupés à part.",
  'projects.category.cloud': 'Cloud & Infrastructure',
  'projects.category.data-ai': 'Data & IA',
  'projects.category.development': 'Développement',
  'projects.status.active': 'En cours',
  'projects.status.completed': 'Terminé',
  'projects.status.archived': 'Archivé',
  'projects.link.repo': 'Dépôt',
  'projects.link.demo': 'Démo',
  'projects.link.article': 'Article',
  'projects.link.other': 'Lien',
  'projects.readMore': 'En savoir plus',
  'projects.openDetails': 'Ouvrir les détails de',
  'projects.close': 'Fermer',
  'projects.builtWith': 'Technologies',
  'projects.empty': 'Rien pour le moment.',

  'fallback.notice':
    "Cette entrée n'est pas encore traduite en français : la version anglaise est affichée.",

  'skip.content': 'Aller au contenu',

  'lang.label': 'Langue',
  'lang.current': 'Langue actuelle',

  'footer.sourceCode': 'Code source',
};

export default fr;
