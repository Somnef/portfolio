import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import {
  MAX_CSP_LENGTH,
  buildCsp,
  buildHeaders,
  collectInlineStyles,
  hashSource,
  toHttpHeaders,
} from './csp.mjs';

const directive = (policy, name) =>
  policy
    .split('; ')
    .find((part) => part === name || part.startsWith(`${name} `))
    ?.split(' ')
    .slice(1);

describe('hashSource', () => {
  it('is the base64 sha256 of the exact text, quoted for CSP', () => {
    const expected = createHash('sha256').update('color:#79B8FF').digest('base64');
    assert.equal(hashSource('color:#79B8FF'), `'sha256-${expected}'`);
  });
});

describe('collectInlineStyles', () => {
  it('finds <style> blocks verbatim, whitespace included', () => {
    const { blocks } = collectInlineStyles('<head><style>\n@font-face{a:b}\n</style></head>');
    assert.deepEqual(blocks, ['\n@font-face{a:b}\n']);
  });

  it('finds style attributes on any element, in either quote style', () => {
    const { attributes } = collectInlineStyles(
      `<pre style="background-color:#24292e"><span style='color:#F97583'>x</span></pre>`,
    );
    assert.deepEqual(attributes, ['background-color:#24292e', 'color:#F97583']);
  });

  it('decodes entities, because browsers hash the decoded value', () => {
    const { attributes } = collectInlineStyles('<p style="content:&quot;&amp;&#39;&#x41;">x</p>');
    assert.deepEqual(attributes, [`content:"&'A`]);
  });

  it('ignores style="..." that is only text, not markup', () => {
    const { attributes } = collectInlineStyles(
      '<p>Never write &lt;div style="color:red"&gt; - or style="x" in prose.</p>',
    );
    assert.deepEqual(attributes, []);
  });

  it('does not mistake data-style or other suffixed names for style', () => {
    const { attributes } = collectInlineStyles('<p data-style="a" class="b">x</p>');
    assert.deepEqual(attributes, []);
  });

  it('refuses an entity it cannot decode rather than hashing the wrong text', () => {
    assert.throws(() => collectInlineStyles('<p style="a&nbsp;b">x</p>'), /Unhandled HTML entity/);
  });
});

describe('buildCsp', () => {
  it('keeps script-src strictly self with nothing configured', () => {
    assert.deepEqual(directive(buildCsp({}), 'script-src'), ["'self'"]);
  });

  it('denies by default and forbids framing', () => {
    const policy = buildCsp({});
    assert.deepEqual(directive(policy, 'default-src'), ["'none'"]);
    assert.deepEqual(directive(policy, 'frame-ancestors'), ["'none'"]);
    assert.equal(directive(policy, 'frame-src'), undefined);
  });

  it('hashes blocks without unsafe-hashes, which only attributes need', () => {
    const styles = directive(buildCsp({ blocks: ['a{}'] }), 'style-src');
    assert.deepEqual(styles, ["'self'", hashSource('a{}')]);
  });

  it('adds unsafe-hashes once attributes are present, deduplicated and sorted', () => {
    const styles = directive(
      buildCsp({ attributes: ['color:#F97583', 'color:#79B8FF', 'color:#F97583'] }),
      'style-src',
    );
    assert.deepEqual(styles, [
      "'self'",
      "'unsafe-hashes'",
      ...[hashSource('color:#79B8FF'), hashSource('color:#F97583')].sort(),
    ]);
  });

  it('is stable regardless of the order styles are found in', () => {
    assert.equal(
      buildCsp({ blocks: ['b', 'a'], attributes: ['y', 'x'] }),
      buildCsp({ blocks: ['a', 'b'], attributes: ['x', 'y'] }),
    );
  });

  it('allows the analytics origin for its script and its beacon only', () => {
    const policy = buildCsp({
      analytics: { provider: 'umami', src: 'https://stats.example.com/script.js', websiteId: 'x' },
    });
    assert.deepEqual(directive(policy, 'script-src'), ["'self'", 'https://stats.example.com']);
    assert.deepEqual(directive(policy, 'connect-src'), ["'self'", 'https://stats.example.com']);
    assert.deepEqual(directive(policy, 'img-src'), ["'self'"]);
  });

  it('refuses a plain-http analytics script', () => {
    assert.throws(
      () =>
        buildCsp({
          analytics: { provider: 'umami', src: 'http://x.example/s.js', websiteId: 'x' },
        }),
      /https/,
    );
  });

  it('allows Turnstile as a script and a frame when enabled', () => {
    const policy = buildCsp({ turnstile: true });
    assert.ok(directive(policy, 'script-src').includes('https://challenges.cloudflare.com'));
    assert.deepEqual(directive(policy, 'frame-src'), ['https://challenges.cloudflare.com']);
  });

  it('fails before exceeding the CloudFront CSP quota', () => {
    const attributes = Array.from({ length: 40 }, (_, i) => `color:#${i}`);
    assert.throws(() => buildCsp({ attributes }), new RegExp(String(MAX_CSP_LENGTH)));
  });
});

describe('toHttpHeaders', () => {
  it('renders HSTS and keeps custom headers', () => {
    const headers = toHttpHeaders(buildHeaders({}));
    assert.equal(headers['Strict-Transport-Security'], 'max-age=63072000; includeSubDomains');
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
    assert.match(headers['Permissions-Policy'], /camera=\(\)/);
  });
});
