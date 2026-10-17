import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
// Imported from zod directly: the `z` re-export from 'astro:content' is
// deprecated in Astro 7. Astro ships Zod 4, so the string-format validators
// are top-level (z.url()) rather than chained (z.string().url()).
import { z } from 'zod';

/*
 * Content collections.
 *
 * Every schema is `.strict()`, so a typo in a frontmatter key fails the build
 * rather than being silently ignored. Cross-collection links use reference(),
 * so a dangling link fails the build too - the brief requires both.
 *
 * Entry ids carry their locale: `src/content/timeline/en/slb.md` has the id
 * `en/slb`. Use the helpers in src/lib/content.ts to split that apart rather
 * than parsing ids in pages. References are always written against the
 * canonical English id (`en/<slug>`) and resolved per-locale at render time.
 */

const timeline = defineCollection({
  loader: glob({ base: './src/content/timeline', pattern: '**/*.md' }),
  schema: () =>
    z
      .object({
        title: z.string().min(1),
        organization: z.string().min(1),
        organizationUrl: z.url().optional(),
        location: z.string().min(1).optional(),
        kind: z.enum(['education', 'work', 'certification', 'other']),
        startDate: z.date(),
        /** Omitted means ongoing. For a certification, an expiry date if you track one. */
        endDate: z.date().optional(),
        /** Shown while the entry is collapsed, so it has to stand alone. */
        summary: z.string().min(1).max(280),
        tech: z.array(z.string().min(1)).default([]),
        projects: z.array(reference('projects')).default([]),
        posts: z.array(reference('writing')).default([]),
        /** Sprite variant for the era this entry covers; see CONTENT.md. */
        avatarVariant: z.string().min(1).optional(),
        /** Credential link, for kind: certification. */
        credentialUrl: z.url().optional(),
        /** Tie-break only; entries sort by startDate descending first. */
        order: z.number().int().optional(),
      })
      .strict()
      .refine((d) => !d.endDate || d.endDate >= d.startDate, {
        message: 'endDate cannot be before startDate',
        path: ['endDate'],
      }),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        summary: z.string().min(1).max(280),
        /**
         * Drives the projects page: `cloud` leads, the others sit behind
         * secondary tabs.
         */
        category: z.enum(['cloud', 'data-ai', 'development']),
        tech: z.array(z.string().min(1)).min(1),
        date: z.date(),
        status: z.enum(['active', 'completed', 'archived']),
        links: z
          .object({
            repo: z.url().optional(),
            demo: z.url().optional(),
            article: z.url().optional(),
            other: z.url().optional(),
          })
          .strict()
          .default({}),
        cover: z
          .object({ src: image(), alt: z.string().min(1) })
          .strict()
          .optional(),
        featured: z.boolean().default(false),
        /** Only when true is the MDX body rendered, at /projects/<slug>. */
        detailPage: z.boolean().default(false),
        order: z.number().int().optional(),
      })
      .strict(),
});

const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        description: z.string().min(1).max(280),
        pubDate: z.date(),
        updatedDate: z.date().optional(),
        type: z.enum(['tutorial', 'article', 'note']),
        tags: z.array(z.string().min(1)).min(1),
        relatedProjects: z.array(reference('projects')).default([]),
        /** Visible in dev, excluded from production builds. */
        draft: z.boolean().default(false),
        cover: z
          .object({ src: image(), alt: z.string().min(1) })
          .strict()
          .optional(),
      })
      .strict()
      .refine((d) => !d.updatedDate || d.updatedDate >= d.pubDate, {
        message: 'updatedDate cannot be before pubDate',
        path: ['updatedDate'],
      }),
});

export const collections = { timeline, projects, writing };
