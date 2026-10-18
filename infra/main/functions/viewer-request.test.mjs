import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadHandler } from '../../../scripts/lib/cloudfront-function.mjs';

const handler = loadHandler(fileURLToPath(new URL('./viewer-request.js', import.meta.url)));

/** A minimal viewer-request event, shaped as CloudFront sends it. */
function event(uri, { host = 'moncefbousselat.com', querystring = {} } = {}) {
  return {
    version: '1.0',
    context: { eventType: 'viewer-request' },
    viewer: { ip: '198.51.100.11' },
    request: { method: 'GET', uri, querystring, headers: { host: { value: host } }, cookies: {} },
  };
}

// The handler's objects come from the vm realm, whose Object.prototype is not
// this one; structuredClone brings them over so strict equality can compare.
const run = (...args) => structuredClone(handler(event(...args)));

const locationOf = (result) => result.headers.location.value;

describe('directory rewrite', () => {
  it('serves the root index', () => {
    assert.equal(run('/').uri, '/index.html');
  });

  for (const uri of ['/projects/', '/fr/', '/fr/writing/tags/aws/']) {
    it(`rewrites ${uri} to its index.html`, () => {
      assert.equal(run(uri).uri, `${uri}index.html`);
    });
  }

  it('leaves the query string on a rewritten request alone', () => {
    const querystring = { utm_source: { value: 'rss' } };
    assert.deepEqual(run('/writing/', { querystring }).querystring, querystring);
  });
});

describe('files pass through untouched', () => {
  for (const uri of [
    '/_astro/BaseLayout.Cwfa5-nX.css',
    '/rss.xml',
    '/fr/rss.xml',
    '/cv/cv-en.pdf',
    '/404.html',
    '/.well-known/security.txt',
  ]) {
    it(uri, () => {
      const result = run(uri);
      assert.equal(result.uri, uri);
      assert.equal(result.statusCode, undefined);
    });
  }
});

describe('missing trailing slash', () => {
  it('301s to the slashed URL', () => {
    const result = run('/projects');
    assert.equal(result.statusCode, 301);
    assert.equal(locationOf(result), '/projects/');
  });

  it('keeps nested paths', () => {
    assert.equal(locationOf(run('/fr/writing')), '/fr/writing/');
  });

  it('keeps the query string', () => {
    const querystring = { utm_source: { value: 'cv' }, ref: { value: '' } };
    assert.equal(locationOf(run('/projects', { querystring })), '/projects/?utm_source=cv&ref');
  });

  it('keeps every value of a repeated parameter', () => {
    const querystring = { tag: { value: 'aws', multiValue: [{ value: 'aws' }, { value: 'iac' }] } };
    assert.equal(locationOf(run('/writing', { querystring })), '/writing/?tag=aws&tag=iac');
  });

  it('marks the redirect cacheable for a bounded time', () => {
    assert.equal(run('/projects').headers['cache-control'].value, 'public, max-age=86400');
  });

  // "//evil.example/" in a Location header is protocol-relative: the browser
  // would leave the site. Leading slashes must collapse to one.
  for (const uri of ['//evil', '///evil', '//evil/path']) {
    it(`never emits a protocol-relative Location for ${uri}`, () => {
      const location = locationOf(run(uri));
      assert.match(location, /^\/[^/]/);
    });
  }
});

describe('www host', () => {
  it('301s to the apex over https, keeping path and query', () => {
    const querystring = { a: { value: '1' } };
    const result = run('/writing/', { host: 'www.moncefbousselat.com', querystring });
    assert.equal(result.statusCode, 301);
    assert.equal(locationOf(result), 'https://moncefbousselat.com/writing/?a=1');
  });

  it('leaves the apex and the cloudfront.net host alone', () => {
    assert.equal(run('/', { host: 'moncefbousselat.com' }).uri, '/index.html');
    assert.equal(run('/', { host: 'd111111abcdef8.cloudfront.net' }).uri, '/index.html');
  });
});
