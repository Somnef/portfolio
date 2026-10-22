import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { composeMail, consoleTransport, createTransport, sesTransport } from './mail.ts';

const visitor = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello.\nBye.' };
const addresses = { from: 'contact@site.test', to: 'owner@site.test' };
const receivedAt = new Date('2026-10-21T09:30:00Z');

describe('composeMail', () => {
  const mail = composeMail(visitor, addresses, receivedAt);

  it('sends from the fixed sender to the fixed recipient', () => {
    assert.equal(mail.from, 'contact@site.test');
    assert.equal(mail.to, 'owner@site.test');
  });

  it('puts the visitor only in Reply-To and the body', () => {
    assert.equal(mail.replyTo, 'ada@example.com');
    assert.equal(mail.subject, 'Portfolio contact: Ada Lovelace');
    assert.match(mail.text, /^From: Ada Lovelace <ada@example\.com>$/m);
    assert.match(mail.text, /^Received: 2026-10-21T09:30:00\.000Z$/m);
    assert.ok(mail.text.includes('\nHello.\nBye.\n'));
  });
});

describe('consoleTransport', () => {
  it('prints the whole email and sends nothing', async () => {
    const lines = [];
    await consoleTransport((line) => lines.push(line))(composeMail(visitor, addresses, receivedAt));
    assert.equal(lines.length, 1);
    assert.match(lines[0], /not sent/);
    assert.match(lines[0], /^Reply-To: ada@example\.com$/m);
    assert.match(lines[0], /Hello\.\nBye\./);
  });
});

describe('sesTransport', () => {
  it('sends one SendEmail with the visitor in ReplyToAddresses only', async () => {
    const sent = [];
    await sesTransport({ send: async (command) => sent.push(command.input) })(
      composeMail(visitor, addresses, receivedAt),
    );
    assert.equal(sent.length, 1);
    const [input] = sent;
    assert.equal(input.FromEmailAddress, 'contact@site.test');
    assert.deepEqual(input.Destination, { ToAddresses: ['owner@site.test'] });
    assert.deepEqual(input.ReplyToAddresses, ['ada@example.com']);
    assert.equal(input.Content.Simple.Subject.Data, 'Portfolio contact: Ada Lovelace');
    assert.equal(input.Content.Simple.Body.Text.Charset, 'UTF-8');
    assert.equal(input.Content.Simple.Body.Html, undefined);
  });

  it('lets a send failure propagate to the handler', async () => {
    const failing = sesTransport({
      send: async () => {
        throw new Error('MessageRejected');
      },
    });
    await assert.rejects(failing(composeMail(visitor, addresses, receivedAt)), /MessageRejected/);
  });
});

describe('createTransport', () => {
  it('picks the transport MAIL_TRANSPORT names', () => {
    assert.equal(typeof createTransport('console', {}), 'function');
    assert.equal(typeof createTransport('ses', {}), 'function');
  });

  it('refuses console mode inside Lambda, where it would log message bodies', () => {
    assert.throws(
      () => createTransport('console', { AWS_LAMBDA_FUNCTION_NAME: 'portfolio-contact' }),
      /local development only/,
    );
  });

  it('refuses an unknown or missing transport', () => {
    assert.throws(() => createTransport(undefined, {}), /MAIL_TRANSPORT/);
    assert.throws(() => createTransport('smtp', {}), /MAIL_TRANSPORT/);
  });
});
