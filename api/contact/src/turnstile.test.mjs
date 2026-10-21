import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSecretLoader } from './secret.ts';
import { SITEVERIFY_URL, verifyTurnstile } from './turnstile.ts';

/** A fetch stand-in that replays one scripted answer per call. */
function scripted(...answers) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const answer = answers[calls.length - 1];
    if (answer instanceof Error) throw answer;
    return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200 });
  };
  return { fetch, calls };
}

const base = { secret: 's3cret', token: 'tok' };

describe('verifyTurnstile', () => {
  it('posts JSON to Siteverify with the secret, token, IP and an idempotency key', async () => {
    const { fetch, calls } = scripted({ body: { success: true, hostname: 'example.com' } });
    assert.deepEqual(await verifyTurnstile({ ...base, remoteIp: '203.0.113.7', fetch }), {
      ok: true,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, SITEVERIFY_URL);
    assert.equal(calls[0].body.secret, 's3cret');
    assert.equal(calls[0].body.response, 'tok');
    assert.equal(calls[0].body.remoteip, '203.0.113.7');
    assert.match(calls[0].body.idempotency_key, /^[0-9a-f-]{36}$/);
  });

  it('omits remoteip when it is unknown', async () => {
    const { fetch, calls } = scripted({ body: { success: true } });
    await verifyTurnstile({ ...base, fetch });
    assert.equal('remoteip' in calls[0].body, false);
  });

  it('rejects an invalid or spent token without retrying', async () => {
    for (const code of ['invalid-input-response', 'timeout-or-duplicate']) {
      const { fetch, calls } = scripted({ body: { success: false, 'error-codes': [code] } });
      assert.deepEqual(await verifyTurnstile({ ...base, fetch }), {
        ok: false,
        reason: 'rejected',
        codes: [code],
      });
      assert.equal(calls.length, 1);
    }
  });

  it('reports a bad secret as unavailable, not as the visitor failing', async () => {
    const { fetch } = scripted({
      body: { success: false, 'error-codes': ['invalid-input-secret'] },
    });
    assert.equal((await verifyTurnstile({ ...base, fetch })).reason, 'unavailable');
  });

  it('retries once on a network error, reusing the idempotency key', async () => {
    const { fetch, calls } = scripted(new TypeError('fetch failed'), { body: { success: true } });
    assert.deepEqual(await verifyTurnstile({ ...base, fetch }), { ok: true });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].body.idempotency_key, calls[1].body.idempotency_key);
  });

  it('retries once on internal-error and on an HTTP error', async () => {
    for (const first of [
      { body: { success: false, 'error-codes': ['internal-error'] } },
      { status: 502, body: {} },
    ]) {
      const { fetch, calls } = scripted(first, { body: { success: true } });
      assert.deepEqual(await verifyTurnstile({ ...base, fetch }), { ok: true });
      assert.equal(calls.length, 2);
    }
  });

  it('gives up as unavailable after the retry fails too', async () => {
    const { fetch, calls } = scripted(new Error('down'), new Error('still down'));
    assert.deepEqual(await verifyTurnstile({ ...base, fetch }), {
      ok: false,
      reason: 'unavailable',
      codes: [],
    });
    assert.equal(calls.length, 2);
  });

  it('times out a hanging request', async () => {
    const fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason));
      });
    const result = await verifyTurnstile({ ...base, fetch, timeoutMs: 10 });
    assert.equal(result.reason, 'unavailable');
  });

  it('checks the hostname only when one is expected', async () => {
    const answer = { body: { success: true, hostname: 'example.com' } };
    assert.deepEqual(
      await verifyTurnstile({
        ...base,
        fetch: scripted(answer).fetch,
        expectedHostname: 'site.test',
      }),
      { ok: false, reason: 'rejected', codes: ['hostname-mismatch'] },
    );
    assert.deepEqual(
      await verifyTurnstile({
        ...base,
        fetch: scripted(answer).fetch,
        expectedHostname: 'example.com',
      }),
      { ok: true },
    );
  });
});

describe('createSecretLoader', () => {
  it('returns a literal secret without reading anything', async () => {
    const load = createSecretLoader({
      value: 'local',
      parameterName: '/x',
      read: () => assert.fail('must not read'),
    });
    assert.equal(await load(), 'local');
  });

  it('reads the parameter once and caches it', async () => {
    let reads = 0;
    const load = createSecretLoader({
      parameterName: '/portfolio/turnstile-secret',
      read: async (name) => {
        reads += 1;
        return `value of ${name}`;
      },
    });
    assert.equal(await load(), 'value of /portfolio/turnstile-secret');
    await Promise.all([load(), load()]);
    assert.equal(reads, 1);
  });

  it('does not cache a failed read', async () => {
    let reads = 0;
    const load = createSecretLoader({
      parameterName: '/p',
      read: async () => {
        reads += 1;
        if (reads === 1) throw new Error('throttled');
        return 'ok';
      },
    });
    await assert.rejects(load(), /throttled/);
    assert.equal(await load(), 'ok');
  });

  it('refuses a configuration with neither a secret nor a parameter', () => {
    assert.throws(() => createSecretLoader({}), /TURNSTILE_SECRET/);
  });
});
