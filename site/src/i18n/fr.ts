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

  'nav.writing': 'Écrits',

  'writing.heading': 'Écrits',
  'writing.intro': 'Tutoriels, articles et notes plus courtes. Filtrez par type ou par mot-clé.',
  'writing.type.tutorial': 'Tutoriel',
  'writing.type.article': 'Article',
  'writing.type.note': 'Note',
  'writing.byType': 'Par type',
  'writing.byTag': 'Par mot-clé',
  'writing.all': 'Tous les écrits',
  'writing.minRead': 'min de lecture',
  'writing.published': 'Publié le',
  'writing.updated': 'Mis à jour le',
  'writing.draft': 'Brouillon',
  'writing.toc': 'Sur cette page',
  'writing.empty': 'Rien de publié ici pour le moment.',
  'writing.feed': 'Flux RSS',
  'writing.feedDescription':
    "Tutoriels, articles et notes sur l'infrastructure cloud et le DevOps.",
  'writing.taggedWith': 'Mot-clé',
  'writing.ofType': 'Type',

  'cv.download': 'Télécharger le CV',
  'cv.downloadLang': 'CV (français)',

  'link.newTab': '(ouvre dans un nouvel onglet)',

  'skip.content': 'Aller au contenu',

  'lang.label': 'Langue',
  'lang.current': 'Langue actuelle',

  'footer.sourceCode': 'Code source',

  'notFound.title': 'Page introuvable',
  'notFound.body':
    "Il n'y a rien à cette adresse. La page a peut-être été déplacée, ou le lien est erroné.",
  'notFound.home': "Retour à la page d'accueil",
};

export default fr;
