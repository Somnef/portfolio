# Adding and editing content

Everything on this site is a file in `site/src/content/`. There is no CMS and no
database: you edit Markdown on a branch, open a pull request, and merging to
`main` rebuilds and redeploys.

The schemas are strict on purpose. A typo in a field name, a date that runs
backwards, or a link to an entry that does not exist all **fail the build**
rather than quietly producing a broken page.

## Where things live

```
site/src/content/
├── timeline/     Journey entries: work, education, certifications
│   ├── en/
│   └── fr/
├── projects/
│   ├── en/
│   └── fr/
└── writing/
    ├── en/
    └── fr/
```

One file per entry. **The filename is the slug** — `slb-cloud-developer.md`
becomes `slb-cloud-developer` in URLs and in cross-references. Use lowercase
words separated by hyphens.

## Translations

A translation is the same filename in the `fr/` folder. Nothing else links
them.

Translations are **optional per item**. When a French version is missing, the
English content is rendered at the French URL with a small "not available in
French" notice — never a 404, never a hidden entry.

**Cross-references are always written against the English id**, with an `en/`
prefix:

```yaml
projects:
  - en/kubernetes-fault-tolerance
```

At render time that resolves to the reader's language automatically, falling
back to English if there is no translation. So you write the reference once and
it works in both languages. Writing `fr/...` in a reference is a mistake even
when the French file exists.

UI strings (navigation, buttons, notices) are not content — they live in
`site/src/i18n/en.ts` and `fr.ts`. English defines the keys; French must cover
every one of them or `npm run check` fails.

## Timeline entries

```yaml
---
title: Cloud Developer # required
organization: SLB # required
organizationUrl: https://www.slb.com # optional
location: France # optional — omit rather than guess
kind: work # required: work | education | certification | other
startDate: 2023-01-01 # required
endDate: 2023-07-31 # optional — omit means "ongoing"
summary: >- # required, max 280 chars
  Shown while the entry is collapsed, so it has to make sense on its own.
tech: # optional
  - AWS
  - Docker
projects: # optional, must exist
  - en/kubernetes-fault-tolerance
posts: # optional, must exist
  - en/some-post
avatarVariant: engineer # optional, see "Pixel avatar sprites"
credentialUrl: https://... # optional, for kind: certification
order: 1 # optional tie-break only
---
The body is the expanded description, revealed when the entry is clicked.
Markdown.
```

Entries sort by `startDate`, newest first. `order` only breaks ties between
entries that start on the same date.

`endDate` must not be before `startDate` — that is checked, not assumed.

## Projects

```yaml
---
title: Kubernetes fault tolerance and autoscaling
summary: >- # max 280 chars; shown on the card
  One or two sentences that say what it is and why it mattered.
category: cloud # required: cloud | data-ai | development
tech: # required, at least one
  - Kubernetes
  - Docker
date: 2025-03-16 # required
status: completed # required: active | completed | archived
featured: true # optional, default false
detailPage: false # optional, default false
links: # all optional
  repo: https://github.com/...
  demo: https://...
  article: https://... # a paper or write-up elsewhere
  other: https://...
cover: # optional, but alt text is REQUIRED if present
  src: ./cover.webp
  alt: Grafana dashboard showing pods scaling out under load
---
```

**`category` drives the projects page.** `cloud` is the primary group and leads
the page; `data-ai` and `development` sit behind secondary tabs. Pick the one
that dominates — it is a single value, not a list.

**`status: archived`** is the honest label for something you no longer touch. It
is not a criticism; it stops old work from implying current focus.

**`detailPage`** controls whether the body is rendered at all. With `false`
(the default) the entry is a card and a modal, and the body is ignored. Set it
to `true` only when you have written a real page's worth of content, and it
gets its own URL at `/projects/<slug>` with a "Read more" link from the modal.
Those files use the `.mdx` extension so they can embed components.

**Alt text is required** whenever `cover` is set. Describe what the image
shows, not that it is an image.

## Writing

```yaml
---
title: Moving a Terraform backend to native S3 locking
description: >- # max 280 chars; used in listings and meta tags
  What the reader gets out of it.
pubDate: 2026-10-17 # required
updatedDate: 2026-11-02 # optional, must not precede pubDate
type: tutorial # required: tutorial | article | note
tags: # required, at least one
  - terraform
  - aws
relatedProjects: # optional, must exist
  - en/ddos-mitigation-aws-terraform
draft: true # optional, default false
---
```

`type` and `tags` both get their own generated pages, so filtering works with
JavaScript disabled.

**Drafts** (`draft: true`) are visible when running `npm run dev` and are
excluded from production builds entirely — the file is not rendered and does
not appear in any listing or the RSS feed.

Reading time is calculated from the body automatically; code blocks are
excluded, since nobody reads those at prose speed. Do not add it to the
frontmatter.

Use `.mdx` for posts with code blocks or components, `.md` for plain prose.

### A note on comments in content files

In `.md` files, use HTML comments:

```markdown
<!-- TODO: expand this section -->
```

In `.mdx` files, use JSX comments:

```mdx
{/* TODO: expand this section */}
```

Getting these the wrong way round is not an error — the comment just renders as
visible text on the page.

## Pixel avatar sprites

The avatar that travels alongside the timeline is decorative and
non-essential: if the sprite files are missing, the site is unaffected.

**Location:** `site/public/sprites/<variant>/`

**Files:** one horizontal PNG strip per animation.

| File       | What           |
| ---------- | -------------- |
| `idle.png` | Standing still |
| `walk.png` | Walking        |

**Requirements:**

- Transparent background.
- Side view, facing **right**. The code mirrors the sprite for leftward motion,
  so do not supply a mirrored copy.
- All frames the same size, laid out left to right in a single row.
- Default frame size is 32×32 px — 4 idle frames, 6 walk frames.

**Frame sizes and counts live in `site/src/config/avatar.json`**, not in the
code, so different dimensions are a config edit rather than a code change.

**Variants** let the avatar change with the era the timeline is showing. Set
`avatarVariant: student` on a timeline entry and the sprite swaps to
`site/public/sprites/student/` while that entry is in view. Entries without an
`avatarVariant` keep whichever sprite was last in use. A variant naming a
folder that does not exist degrades to the default sprite rather than breaking.

Replacing the placeholder art is a drop-in file swap, as long as the frame
counts match the config.

## Checking your work

```sh
npm run dev     # drafts visible, schema errors shown in the dev overlay
npm run check   # types and content schemas
npm run build   # what CI runs on every PR; fails on any invalid content
```

Error messages name the file, the field, and what was wrong. For example:

```
[InvalidContentEntryDataError] timeline → en/slb-cloud-developer
  endDate: endDate cannot be before startDate
```

```
[ERROR] [content] Invalid content reference: entry "en/ericsson-cloud-ai-engineer"
  in collection "timeline" (field: projects[0]) references
  "en/project-that-does-not-exist" in collection "projects", but that entry does
  not exist.
```

## Things that are deliberately strict

- **Unknown fields are rejected.** `company:` instead of `organization:` fails
  the build instead of being ignored, so a typo can never silently drop content.
- **References must resolve.** You cannot ship a link to a project you renamed.
- **Dates are checked against each other**, not just parsed.
- **Alt text is mandatory** on every image.
- **Summaries are capped at 280 characters**, because they appear in collapsed
  cards where longer text breaks the layout.
