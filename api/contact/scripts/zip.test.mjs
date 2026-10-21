import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { zip } from './zip.mjs';

// Checked with the system unzip rather than a reader of our own, so the
// test cannot share a misunderstanding of the format with the writer.
const dir = mkdtempSync(join(tmpdir(), 'zip-test-'));
after(() => rmSync(dir, { recursive: true, force: true }));

function written(files) {
  const path = join(dir, `${Object.keys(files).join('-')}.zip`);
  writeFileSync(path, zip(files));
  return path;
}

describe('zip', () => {
  const files = {
    'index.mjs': Buffer.from('export const handler = async () => ({ statusCode: 200 });\n'),
    'b.txt': Buffer.from('é'.repeat(5000)),
  };

  it('is byte-for-byte reproducible', () => {
    assert.deepEqual(zip(files), zip(files));
    assert.deepEqual(zip(files), zip({ 'b.txt': files['b.txt'], 'index.mjs': files['index.mjs'] }));
  });

  it('passes the unzip integrity test and round-trips every file', () => {
    const path = written(files);
    execFileSync('unzip', ['-tq', path]);
    for (const [name, data] of Object.entries(files)) {
      assert.deepEqual(execFileSync('unzip', ['-p', path, name]), data);
    }
  });

  it('stores fixed times and rw-r--r-- permissions', () => {
    const listing = execFileSync('zipinfo', [written(files)], { encoding: 'utf8' });
    const entries = listing.split('\n').filter((line) => line.startsWith('-'));
    assert.equal(entries.length, 2);
    for (const line of entries) {
      assert.match(line, /^-rw-r--r-- .* 80-Jan-01 00:00 /);
    }
  });
});
