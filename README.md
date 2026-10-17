# Portfolio

Personal portfolio site for a Cloud & DevOps engineer. Static, content-driven,
accessible, and cheap to run — self-hosted on AWS.

Content lives as Markdown and MDX in the repo. There is no CMS, no database and
no runtime content fetching: merging a pull request to `main` rebuilds and
redeploys the site.

## Stack

| Layer          | Choice                                                             |
| -------------- | ------------------------------------------------------------------ |
| Site           | [Astro](https://astro.build) 7, static output, content collections |
| Content        | Markdown / MDX with Zod-validated frontmatter                      |
| Styling        | Plain CSS with custom-property design tokens                       |
| Interactivity  | Small vanilla TypeScript islands, no framework runtime             |
| Contact form   | TypeScript Lambda on Node.js 24 behind API Gateway, SES            |
| Infrastructure | Terraform — S3, CloudFront, ACM, Route 53                          |
| CI/CD          | GitHub Actions with OIDC, no long-lived AWS credentials            |

## Requirements

- Node.js 24 (the version in `.tool-versions`)
- npm 11

Tool versions are pinned in `.tool-versions`. With [asdf](https://asdf-vm.com):

```sh
asdf install
```

## Getting started

```sh
npm install
npm run dev
```

The dev server runs at `http://localhost:4321` with hot reloading for
components, styles and content.

No AWS credentials are needed for local development, and none are needed to run
any check in this list.

## Scripts

Run from the repository root.

| Command                | Does                                  |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Dev server with hot reloading         |
| `npm run build`        | Production build to `site/dist/`      |
| `npm run check`        | Type and Astro diagnostics            |
| `npm run lint`         | ESLint, including accessibility rules |
| `npm run format`       | Format with Prettier                  |
| `npm run format:check` | Verify formatting                     |
| `npm test`             | Run workspace tests                   |

## Layout

```
site/            Astro app and all content
api/contact/     Contact form Lambda
infra/           Terraform (bootstrap applied locally, main applied by CI)
config/          Security header and CSP definitions, shared by preview and CDN
scripts/         Local preview server and build tooling
docs/            Infrastructure and pipeline notes
```

## Accessibility and performance

Accessibility is a build-time concern rather than an afterthought:
accessibility rules run in ESLint, images require alt text in their content
schemas, and all core content is readable with JavaScript disabled.

The colour palette is verified against WCAG AA contrast ratios, and every
animation respects `prefers-reduced-motion`.

## Licence

Source code is available for reference. Site content, written material and
imagery are not licensed for reuse.
