/**
 * Local production check: serves site/dist the way CloudFront will.
 *
 *   npm run build && npm run headers && npm run preview
 *
 * Each request goes through the same steps as at the edge:
 *   1. the real viewer-request CloudFront Function, loaded through node:vm
 *      (its redirects are returned as-is, its rewrites change the path);
 *   2. a lookup in dist/, as S3 would do for the rewritten key;
 *   3. a miss serves /404.html with status 404, like the distribution's
 *      custom error response;
 *   4. every response carries the headers in config/headers.json - the file
 *      Terraform turns into the response headers policy.
 *
 * So a CSP violation shows up here, in the browser console, before a deploy.
 * The server refuses to start if headers.json is stale for the build it is
 * serving, since then it would be checking the wrong policy.
 */
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, headersPath } from './gen-headers.mjs';
import { loadHandler } from './lib/cloudfront-function.mjs';
import { toHttpHeaders } from './lib/csp.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const distDir = join(root, 'site', 'dist');
const functionPath = join(root, 'infra', 'main', 'functions', 'viewer-request.js');

// Clear of 4321 and up: Astro's dev server and `astro preview` start there
// and count upwards when a port is taken, and the dev server stays running
// alongside this.
const port = Number(process.env.PORT ?? 4500);
const host = process.env.HOST ?? '0.0.0.0';

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

const committed = await readFile(headersPath, 'utf8').catch(() => null);
if (committed !== (await generate())) {
  console.error(
    'config/headers.json is missing or stale for this build. Run `npm run headers` first.',
  );
  process.exit(1);
}

const securityHeaders = toHttpHeaders(JSON.parse(committed));
const handler = loadHandler(functionPath);

/** The node request, in the shape a viewer-request function receives. */
function toEvent(req, url) {
  const querystring = {};
  for (const [name, value] of url.searchParams) {
    const field = querystring[name];
    if (field) {
      field.multiValue = field.multiValue ?? [{ value: field.value }];
      field.multiValue.push({ value });
    } else {
      querystring[name] = { value };
    }
  }

  const headers = {};
  for (const [name, value] of Object.entries(req.headers)) {
    headers[name] = { value: Array.isArray(value) ? value.join(', ') : value };
  }

  return {
    version: '1.0',
    context: { eventType: 'viewer-request' },
    viewer: { ip: req.socket.remoteAddress },
    request: { method: req.method, uri: url.pathname, querystring, headers, cookies: {} },
  };
}

/** The file an S3 key maps to, or null if it is missing or escapes dist/. */
async function resolveKey(uri) {
  let key;
  try {
    key = decodeURIComponent(uri);
  } catch {
    return null;
  }

  const path = normalize(join(distDir, key));
  if (path !== distDir && !path.startsWith(distDir + sep)) {
    return null;
  }

  const info = await stat(path).catch(() => null);
  return info?.isFile() ? path : null;
}

function send(res, status, path) {
  res.writeHead(status, {
    ...securityHeaders,
    'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
  });
  createReadStream(path).pipe(res);
}

const server = createServer(async (req, res) => {
  // Concatenated, not resolved: new URL('//evil', base) would read "//evil"
  // as a host, hiding exactly the path the function has to defend against.
  const url = new URL(`http://preview.local${req.url ?? '/'}`);
  const result = handler(toEvent(req, url));

  // A function-generated response (the redirects) goes straight back.
  if (result.statusCode) {
    const headers = { ...securityHeaders };
    for (const [name, { value }] of Object.entries(result.headers ?? {})) {
      headers[name] = value;
    }
    res.writeHead(result.statusCode, result.statusDescription, headers);
    res.end();
    log(req, result.statusCode, headers.location);
    return;
  }

  const file = await resolveKey(result.uri);
  if (file) {
    send(res, 200, file);
    log(req, 200, result.uri === url.pathname ? undefined : result.uri);
  } else {
    send(res, 404, join(distDir, '404.html'));
    log(req, 404);
  }
});

function log(req, status, note) {
  console.log(`${status} ${req.method} ${req.url}${note ? ` -> ${note}` : ''}`);
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is in use. Pick another with PORT=<n> npm run preview.`);
    process.exit(1);
  }
  throw error;
});

server.listen(port, host, () => {
  console.log(`Previewing site/dist with production headers at http://localhost:${port}/`);
});
