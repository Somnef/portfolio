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

  'site.tagline':
    'I build and run cloud infrastructure for a living, and collect side projects the rest of the time.',

  'nav.label': 'Main',
  'nav.home': 'Home',
  'nav.journey': 'Journey',
  'nav.projects': 'Projects',

  'hero.cta.journey': 'See the journey',
  'hero.cta.projects': 'Browse projects',

  'journey.heading': 'Journey',
  'journey.intro':
    'Roles, degrees and certifications, most recent first. Open an entry for the detail.',
  'journey.ongoing': 'Present',
  'journey.relatedProjects': 'Related projects',
  'journey.kind.work': 'Work',
  'journey.kind.education': 'Education',
  'journey.kind.certification': 'Certification',
  'journey.kind.other': 'Other',
  'journey.credential': 'View credential',

  'projects.heading': 'Projects',
  'projects.intro':
    'Infrastructure work first. Earlier data and machine learning projects are grouped separately.',
  'projects.category.cloud': 'Cloud & Infrastructure',
  'projects.category.data-ai': 'Data & AI',
  'projects.category.development': 'Development',
  'projects.status.active': 'Active',
  'projects.status.completed': 'Completed',
  'projects.status.archived': 'Archived',
  'projects.link.repo': 'Repository',
  'projects.link.demo': 'Demo',
  'projects.link.article': 'Write-up',
  'projects.link.other': 'Link',
  'projects.readMore': 'Read more',
  'projects.openDetails': 'Open details for',
  'projects.close': 'Close',
  'projects.builtWith': 'Built with',
  'projects.empty': 'Nothing here yet.',

  'fallback.notice':
    'This entry has not been translated into French yet, so the English version is shown.',

  'nav.writing': 'Writing',

  'writing.heading': 'Writing',
  'writing.intro': 'Tutorials, articles and shorter notes. Filter by type or tag.',
  'writing.type.tutorial': 'Tutorial',
  'writing.type.article': 'Article',
  'writing.type.note': 'Note',
  'writing.byType': 'By type',
  'writing.byTag': 'By tag',
  'writing.all': 'All writing',
  'writing.minRead': 'min read',
  'writing.published': 'Published',
  'writing.updated': 'Updated',
  'writing.draft': 'Draft',
  'writing.toc': 'On this page',
  'writing.empty': 'Nothing published here yet.',
  'writing.feed': 'RSS feed',
  'writing.feedDescription': 'Tutorials, articles and notes on cloud infrastructure and DevOps.',
  'writing.taggedWith': 'Tagged',
  'writing.ofType': 'Type',

  'cv.download': 'Download CV',
  'cv.downloadLang': 'CV (English)',

  'link.newTab': '(opens in a new tab)',

  'skip.content': 'Skip to content',

  'lang.label': 'Language',
  'lang.current': 'Current language',

  'footer.sourceCode': 'Source code',
} as const;

export type UIStrings = Record<keyof typeof en, string>;
export type UIKey = keyof typeof en;

export default en;
