// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import { shikiStyleToClass } from './src/lib/shiki-classes.ts';

export default defineConfig({
  // Drives canonical URLs, hreflang alternates and the RSS feed's absolute
  // links. Terraform's `domain_name` variable must match this value, since
  // that is what provisions the ACM certificate and the Route 53 records.
  site: 'https://moncefbousselat.com',
  output: 'static',

  integrations: [mdx()],

  /*
   * English is the default and is served unprefixed at /; French lives under
   * /fr/. prefixDefaultLocale stays false so the canonical English URLs have
   * no /en/ segment.
   *
   * Astro's i18n routing does NOT fall back automatically here: a missing
   * French page would 404. The brief wants the English content rendered at the
   * French URL with a notice instead, so that fallback is handled in the
   * content layer when collections land, not by routing config.
   */
  i18n: {
    locales: ['en', 'fr'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },

  /*
   * Fonts are self-hosted. The google provider downloads the files at BUILD
   * time and serves them from our own origin, so the browser never calls
   * fonts.googleapis.com or fonts.gstatic.com at runtime - which is what lets
   * the CSP stay strict (no third-party font-src).
   *
   * IBM Plex Sans + IBM Plex Mono: one family, two voices. Mono carries
   * headings, labels and dates; sans carries body text.
   *
   * IBM Plex Mono has no variable build, so both are loaded as static weights.
   * Only 400 and 600 are used anywhere in the design, so only those ship.
   *
   * subsets: ['latin'] only. Google's latin range already covers U+0152-0153
   * (the French OE ligature) along with all accented Latin-1, so latin-ext
   * would only add Eastern-European glyphs this site never renders - verified
   * against the generated unicode-range declarations.
   *
   * No preload: it is per-family and all-variants, which meant 8 blocking font
   * requests on first paint including italics most pages never use. Without
   * it every face downloads lazily when a glyph actually needs it, and
   * font-display: swap plus optimizedFallbacks covers the gap - the better
   * trade against the Lighthouse >= 95 bar.
   */
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-sans',
      weights: [400, 600],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      // Metric-adjusted fallback, so the swap does not shift layout.
      optimizedFallbacks: true,
    },
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-mono',
      weights: [400, 600],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      optimizedFallbacks: true,
    },
  ],

  /*
   * Nothing inline, so the Content-Security-Policy can be a plain
   * script-src 'self'; style-src 'self' with no hashes and no meta tag.
   *
   * Astro otherwise inlines small hoisted <script> blocks and small
   * stylesheets straight into the HTML, which a strict CSP would block unless
   * every one of their sha256 hashes were tracked in the header. Keeping the
   * output external moves that problem out of existence.
   *
   * Astro 7 does offer security.csp, which emits a <meta http-equiv> CSP with
   * the hashes computed for you - but the CSP for this site is a CloudFront
   * response header (one source of truth shared with the local preview
   * server), and frame-ancestors is ignored in a meta CSP, so the header has
   * to carry it regardless. Two overlapping policies would then both be
   * enforced. External files avoid all of it.
   *
   * Cost: small assets are no longer inlined as data URIs, so they become
   * separate requests. With immutable caching on hashed filenames that is a
   * fair trade, and arguably better for caching.
   */
  build: {
    inlineStylesheets: 'never',
  },

  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },

  markdown: {
    shikiConfig: {
      // Token colours come from github-dark; its background is overridden in
      // global.css (see the pre.astro-code rule and the reason there).
      theme: 'github-dark',
      wrap: false,
      // Inline styles become classes (styles/shiki.css), so the CSP needs no
      // hash per token colour and posts never change the response headers.
      transformers: [shikiStyleToClass()],
    },
  },
});
