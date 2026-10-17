// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  // Placeholder until a domain is chosen; drives canonical URLs and the
  // sitemap. The infra `domain_name` variable stays null until then.
  site: 'https://example.com',
  output: 'static',

  integrations: [mdx()],

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

  markdown: {
    shikiConfig: {
      // Token colours come from github-dark; its background is overridden in
      // global.css (see the pre.astro-code rule and the reason there).
      theme: 'github-dark',
      wrap: false,
    },
  },
});
