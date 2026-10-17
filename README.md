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

## Troubleshooting

### `Node.js v20.x is not supported by Astro` or `npm error code EBADENGINE`

The shell is running a different Node than the one `.tool-versions` pins.
Check it:

```sh
node -v          # must match .tool-versions
which node       # should be inside your version manager, not /usr/local/bin
```

If you use asdf, the shims directory must be **prepended** to `PATH` in a file
every shell reads — `~/.zshenv` for zsh, `~/.bashrc` for bash. Putting it only
in `~/.zshrc` covers interactive shells but not login or non-interactive ones,
so editor tasks and scripts silently fall back to whatever Node is on the
system `PATH`:

```sh
export ASDF_DATA_DIR="$HOME/.asdf"
export PATH="$ASDF_DATA_DIR/shims:$PATH"
```

`engine-strict` is deliberately on in `.npmrc`, so a wrong Node version fails
at `npm install` with the required and actual versions named, rather than
surfacing later as a confusing build error.

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
