import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { codeToHtml } from 'shiki';
import githubDark from 'shiki/themes/github-dark.mjs';
import { classesFor, classesForStyle, shikiStyleToClass } from './shiki-classes.ts';

const css = await readFile(new URL('../styles/shiki.css', import.meta.url), 'utf8');
const cssClasses = new Set([...css.matchAll(/\.(sh-[a-z0-9-]+)/g)].map((match) => match[1]));

const FONT_STYLE_CLASSES = {
  italic: 'sh-italic',
  bold: 'sh-bold',
  underline: 'sh-underline',
  strikethrough: 'sh-line-through',
};

/** Every class the transformer can produce for github-dark, read from the theme. */
function themeClasses() {
  const classes = new Set(['sh-no-select', 'sh-scroll']);
  const color = (hex) => hex.slice(1).toLowerCase();

  classes.add(`sh-${color(githubDark.colors['editor.foreground'])}`);
  classes.add(`sh-bg-${color(githubDark.colors['editor.background'])}`);
  for (const { settings } of githubDark.tokenColors) {
    if (settings.foreground) classes.add(`sh-${color(settings.foreground)}`);
    if (settings.background) classes.add(`sh-bg-${color(settings.background)}`);
    for (const word of (settings.fontStyle ?? '').split(/\s+/).filter(Boolean)) {
      classes.add(FONT_STYLE_CLASSES[word]);
    }
  }
  return classes;
}

describe('classesFor', () => {
  it('maps colours to a class named after the hex, lowercased', () => {
    assert.deepEqual(classesFor('color:#F97583'), ['sh-f97583']);
    assert.deepEqual(classesFor('background-color: #86181D'), ['sh-bg-86181d']);
  });

  it('maps font styles and both text decorations', () => {
    assert.deepEqual(classesFor('font-style:italic'), ['sh-italic']);
    assert.deepEqual(classesFor('text-decoration:underline line-through'), [
      'sh-underline',
      'sh-line-through',
    ]);
  });

  it("maps Astro's own declarations, whatever their spacing", () => {
    assert.deepEqual(classesFor(' overflow-x: auto'), ['sh-scroll']);
    assert.deepEqual(classesFor('user-select: none'), ['sh-no-select']);
  });

  it('throws on anything unmapped instead of letting it through', () => {
    assert.throws(() => classesFor('color:red'), /no class mapping/);
    assert.throws(() => classesFor('white-space:pre-wrap'), /no class mapping/);
    assert.throws(() => classesFor('nonsense'), /no class mapping/);
  });
});

describe('classesForStyle', () => {
  it("splits Astro's <pre> style, empty parts and all", () => {
    assert.deepEqual(classesForStyle('background-color:#24292e;color:#e1e4e8; overflow-x: auto;'), [
      'sh-bg-24292e',
      'sh-e1e4e8',
      'sh-scroll',
    ]);
  });
});

describe('styles/shiki.css', () => {
  it('has a rule for every class github-dark can produce', () => {
    const missing = [...themeClasses()].filter((name) => !cssClasses.has(name));
    assert.deepEqual(missing, []);
  });

  it('has no rule the theme can never produce', () => {
    const expected = themeClasses();
    const unused = [...cssClasses].filter((name) => !expected.has(name));
    assert.deepEqual(unused, []);
  });
});

describe('shikiStyleToClass', () => {
  const samples = {
    ts: 'const answer: number = 42; // the answer\nexport default /a+b/g;',
    diff: '--- a/file\n+++ b/file\n@@ -1 +1 @@\n-old\n+new',
    md: '# Title\n\n*italic* **bold** [link](https://example.com)',
    hcl: 'resource "aws_s3_bucket" "site" {\n  bucket = var.name\n}',
  };

  for (const [lang, code] of Object.entries(samples)) {
    it(`leaves no style attribute in highlighted ${lang}, only known classes`, async () => {
      const html = await codeToHtml(code, {
        lang,
        theme: 'github-dark',
        transformers: [shikiStyleToClass()],
      });
      assert.doesNotMatch(html, /\sstyle=/);

      const used = [...html.matchAll(/\b(sh-[a-z0-9-]+)/g)].map((match) => match[1]);
      assert.ok(used.length > 0);
      assert.deepEqual(
        used.filter((name) => !cssClasses.has(name)),
        [],
      );
    });
  }

  it('keeps the classes an element already had', async () => {
    const html = await codeToHtml('x', {
      lang: 'txt',
      theme: 'github-dark',
      transformers: [shikiStyleToClass()],
    });
    assert.match(html, /<pre class="shiki github-dark sh-bg-24292e sh-e1e4e8"/);
  });
});
