import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { useTranslations } from '../../i18n';
import { byDateDesc, getLocalized } from '../../lib/content';

/** French feed. Untranslated posts appear with their English text, matching
 *  what /fr/writing/ shows, rather than leaving the feed empty. */
export const GET: APIRoute = async (context) => {
  const t = useTranslations('fr');
  const posts = (await getLocalized('writing', 'fr')).sort(byDateDesc);

  return rss({
    title: `${t('site.title')} — ${t('writing.heading')}`,
    description: t('writing.feedDescription'),
    site: context.site ?? 'https://example.com',
    items: posts.map((item) => ({
      title: item.entry.data.title,
      description: item.entry.data.description,
      pubDate: item.entry.data.pubDate,
      link: `/fr/writing/${item.slug}/`,
      categories: item.entry.data.tags,
    })),
    customData: '<language>fr</language>',
  });
};
