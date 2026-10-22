import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LIMITS } from './limits.ts';
import { validate } from './validate.ts';

const JSON_TYPE = 'application/json';

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Hello.\nSecond line.',
  token: 'XXXX.DUMMY.TOKEN.XXXX',
  website: '',
  elapsedMs: 12_000,
};

const run = (overrides = {}, contentType = JSON_TYPE) =>
  validate(JSON.stringify({ ...valid, ...overrides }), contentType);

const fieldsOf = (verdict) => {
  assert.equal(verdict.ok, false);
  assert.equal(verdict.error, 'validation');
  return verdict.fields;
};

describe('validate: request shape', () => {
  it('accepts a well-formed submission and trims fields', () => {
    const verdict = run({ name: '  Ada  ', message: '\n Hi \n' });
    assert.equal(verdict.ok, true);
    assert.deepEqual(verdict.submission, {
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hi',
      token: valid.token,
      suspicious: false,
    });
  });

  it('accepts a charset parameter on the content type', () => {
    assert.equal(run({}, 'application/json; charset=utf-8').ok, true);
    assert.equal(run({}, 'Application/JSON').ok, true);
  });

  for (const type of [undefined, '', 'text/plain', 'application/x-www-form-urlencoded']) {
    it(`refuses content type ${JSON.stringify(type)} with 415`, () => {
      assert.deepEqual(validate(JSON.stringify(valid), type), {
        ok: false,
        status: 415,
        error: 'unsupportedMediaType',
      });
    });
  }

  it('refuses a body over the byte limit with 413, counting bytes not characters', () => {
    // 'é' is two bytes in UTF-8: under the limit in characters, over it in bytes.
    const body = JSON.stringify({ ...valid, message: 'é'.repeat(LIMITS.bodyMaxBytes / 2) });
    assert.ok(body.length < LIMITS.bodyMaxBytes * 1.1);
    assert.deepEqual(validate(body, JSON_TYPE), { ok: false, status: 413, error: 'tooLarge' });
  });

  for (const body of ['', 'not json', '[]', 'null', '"text"', '42']) {
    it(`refuses ${JSON.stringify(body)} as a bad request`, () => {
      assert.deepEqual(validate(body, JSON_TYPE), {
        ok: false,
        status: 400,
        error: 'badRequest',
      });
    });
  }

  it('refuses unknown keys rather than ignoring them', () => {
    assert.deepEqual(run({ cc: 'someone@example.com' }), {
      ok: false,
      status: 400,
      error: 'badRequest',
    });
  });
});

describe('validate: fields', () => {
  it('reports every missing field at once', () => {
    const verdict = validate('{}', JSON_TYPE);
    assert.deepEqual(fieldsOf(verdict), {
      name: 'required',
      email: 'required',
      message: 'required',
      token: 'required',
    });
  });

  it('treats whitespace-only as missing', () => {
    assert.deepEqual(fieldsOf(run({ name: ' \t ' })), { name: 'required' });
  });

  it('rejects non-string values', () => {
    assert.deepEqual(fieldsOf(run({ name: 42, message: ['a'] })), {
      name: 'invalid',
      message: 'invalid',
    });
  });

  for (const [field, max] of [
    ['name', LIMITS.nameMax],
    ['message', LIMITS.messageMax],
    ['token', LIMITS.tokenMax],
  ]) {
    it(`${field}: allows exactly ${max} characters, refuses ${max + 1}`, () => {
      assert.equal(run({ [field]: 'a'.repeat(max) }).ok, true);
      assert.deepEqual(fieldsOf(run({ [field]: 'a'.repeat(max + 1) })), { [field]: 'tooLong' });
    });
  }

  it('email: refuses an address over the length limit', () => {
    const long = `${'a'.repeat(60)}@${'b'.repeat(200)}.com`;
    assert.deepEqual(fieldsOf(run({ email: long })), { email: 'tooLong' });
  });

  it('name: refuses line breaks and other control characters', () => {
    for (const name of ['Ada\nBcc: x@example.com', 'Ada\rX', 'Ada\u0000']) {
      assert.deepEqual(fieldsOf(run({ name })), { name: 'invalid' }, JSON.stringify(name));
    }
  });

  it('message: keeps newlines and tabs, refuses other control characters', () => {
    assert.equal(run({ message: 'a\r\n\tb' }).ok, true);
    assert.deepEqual(fieldsOf(run({ message: 'a\u0007b' })), { message: 'invalid' });
  });

  for (const email of [
    'ada@example.com',
    'ada.lovelace+portfolio@mail.example.co.uk',
    "o'brien@example.ie",
    'ADA@EXAMPLE.COM',
  ]) {
    it(`email: accepts ${email}`, () => {
      assert.equal(run({ email }).ok, true);
    });
  }

  for (const email of [
    'ada',
    'ada@',
    '@example.com',
    'ada@example',
    'ada@@example.com',
    'ada..x@example.com',
    '.ada@example.com',
    'ada@-example.com',
    'ada@example.com, eve@example.com',
    'Ada <ada@example.com>',
    '"ada"@example.com',
    'ada@[127.0.0.1]',
    'ada@exa mple.com',
    'ada\n@example.com',
    `${'a'.repeat(65)}@example.com`,
  ]) {
    it(`email: refuses ${JSON.stringify(email)}`, () => {
      assert.deepEqual(fieldsOf(run({ email })), { email: 'invalid' });
    });
  }
});

describe('validate: bot signals', () => {
  it('flags a filled honeypot without reporting it as an error', () => {
    const verdict = run({ website: 'http://spam.example' });
    assert.equal(verdict.ok, true);
    assert.equal(verdict.submission.suspicious, true);
  });

  it('flags a submission faster than the minimum fill time', () => {
    assert.equal(run({ elapsedMs: LIMITS.minFillMs - 1 }).submission.suspicious, true);
    assert.equal(run({ elapsedMs: LIMITS.minFillMs }).submission.suspicious, false);
  });

  it('flags a missing or non-numeric fill time', () => {
    const rest = { ...valid };
    delete rest.elapsedMs;
    assert.equal(validate(JSON.stringify(rest), JSON_TYPE).submission.suspicious, true);
    assert.equal(run({ elapsedMs: '9000' }).submission.suspicious, true);
  });
});
