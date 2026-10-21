/**
 * Builds the Lambda deployment package:
 *
 *   npm run build --workspace api/contact
 *     -> api/contact/dist/index.mjs     the bundle, for inspection
 *     -> api/contact/dist/contact.zip   what Terraform uploads
 *
 * One ESM file with the AWS SDK clients bundled in, rather than relying on
 * the copy the runtime ships: the version is then the one the lockfile and
 * the tests pinned, and a runtime update cannot change it underneath us.
 *
 * The zip is byte-for-byte reproducible (see zip.mjs), so the CI plan and a
 * local build of the same commit agree, and an unchanged handler never shows
 * up as a Lambda change.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { zip } from './zip.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');

const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  // Prefer the SDK's ESM builds, which tree-shake.
  mainFields: ['module', 'main'],
  minify: true,
  legalComments: 'none',
  write: false,
  outfile: 'dist/index.mjs',
  logLevel: 'warning',
});

const [output] = result.outputFiles;
const archive = zip({ 'index.mjs': Buffer.from(output.contents) });

await mkdir(dist, { recursive: true });
await writeFile(join(dist, 'index.mjs'), output.contents);
await writeFile(join(dist, 'contact.zip'), archive);

// The value Terraform's filebase64sha256() will compute, for comparing builds.
const hash = createHash('sha256').update(archive).digest('base64');
console.log(`dist/contact.zip  ${(archive.length / 1024).toFixed(0)} KiB  sha256 (base64) ${hash}`);
