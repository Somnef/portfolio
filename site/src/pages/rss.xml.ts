import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { defaultLang, useTranslations } from '../i18n';
import { byDateDesc, getLocalized } from '../lib/content';

/*
 * Drafts never reach the feed: getLocalized drops them in production, so this
 * route needs no filter of its own.
 */
export const GET: APIRoute = async (context) => {
  const t = useTranslations(defaultLang);
  const posts = (await getLocalized('writing', defaultLang)).sort(byDateDesc);

  return rss({
    title: `${t('site.title')} — ${t('writing.heading')}`,
    description: t('writing.feedDescription'),
    // The site URL comes from astro.config.mjs, so the feed carries absolute
    // links without hardcoding a domain here.
    site: context.site ?? 'https://example.com',
    items: posts.map((item) => ({
      title: item.entry.data.title,
      description: item.entry.data.description,
      pubDate: item.entry.data.pubDate,
      link: `/writing/${item.slug}/`,
      categories: item.entry.data.tags,
    })),
    customData: `<language>${defaultLang}</language>`,
  });
};
