/**
 * Request validation for the contact endpoint. Pure: a body string and a
 * Content-Type in, a verdict out. No I/O, so every rule is unit-tested
 * directly and the handler only decides what each verdict costs.
 */
import { LIMITS } from './limits.ts';

export type Field = 'name' | 'email' | 'message' | 'token';
export type FieldError = 'required' | 'tooLong' | 'invalid';

/** What the client sends. `website` is the honeypot, `elapsedMs` the fill time. */
export interface Submission {
  name: string;
  email: string;
  message: string;
  token: string;
  /** True when the honeypot was filled or the form came back too fast. */
  suspicious: boolean;
}

export type Verdict =
  | { ok: true; submission: Submission }
  | {
      ok: false;
      status: 400 | 413 | 415;
      error: 'unsupportedMediaType' | 'tooLarge' | 'badRequest';
    }
  | { ok: false; status: 400; error: 'validation'; fields: Partial<Record<Field, FieldError>> };

const ALLOWED_KEYS = new Set(['name', 'email', 'message', 'token', 'website', 'elapsedMs']);

// C0 controls and DEL. Single-line fields allow none of them, which is what
// keeps a name or address from ever smuggling a line break into a header.
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL = /[\u0000-\u001f\u007f]/;
// The message keeps tab, LF and CR; every other control character is refused.
// eslint-disable-next-line no-control-regex -- as above
const MESSAGE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

/*
 * Deliberately narrower than RFC 5322: a dot-atom local part and a domain of
 * LDH labels with a TLD. No quoted local parts, comments, IP literals or
 * display names - nothing that could add a second address to Reply-To.
 */
const EMAIL =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

function isJsonContentType(value: string | undefined): boolean {
  if (!value) return false;
  const [type] = value.split(';');
  return type?.trim().toLowerCase() === 'application/json';
}

function text(
  value: unknown,
  max: number,
  control: RegExp,
): { value: string } | { error: FieldError } {
  if (value === undefined || value === null) return { error: 'required' };
  if (typeof value !== 'string') return { error: 'invalid' };
  const trimmed = value.trim();
  if (trimmed.length === 0) return { error: 'required' };
  if (trimmed.length > max) return { error: 'tooLong' };
  if (control.test(trimmed)) return { error: 'invalid' };
  return { value: trimmed };
}

export function validate(body: string, contentType: string | undefined): Verdict {
  if (!isJsonContentType(contentType)) {
    return { ok: false, status: 415, error: 'unsupportedMediaType' };
  }
  if (Buffer.byteLength(body, 'utf8') > LIMITS.bodyMaxBytes) {
    return { ok: false, status: 413, error: 'tooLarge' };
  }

  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return { ok: false, status: 400, error: 'badRequest' };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, status: 400, error: 'badRequest' };
  }
  const input = data as Record<string, unknown>;
  if (Object.keys(input).some((key) => !ALLOWED_KEYS.has(key))) {
    return { ok: false, status: 400, error: 'badRequest' };
  }

  const fields: Partial<Record<Field, FieldError>> = {};

  const name = text(input.name, LIMITS.nameMax, CONTROL);
  if ('error' in name) fields.name = name.error;

  const email = text(input.email, LIMITS.emailMax, CONTROL);
  if ('error' in email) fields.email = email.error;
  else if (!EMAIL.test(email.value) || email.value.split('@')[0]!.length > 64) {
    fields.email = 'invalid';
  }

  const message = text(input.message, LIMITS.messageMax, MESSAGE_CONTROL);
  if ('error' in message) fields.message = message.error;

  const token = text(input.token, LIMITS.tokenMax, CONTROL);
  if ('error' in token) fields.token = token.error;

  if (
    'error' in name ||
    'error' in email ||
    'error' in message ||
    'error' in token ||
    fields.email
  ) {
    return { ok: false, status: 400, error: 'validation', fields };
  }

  // Both checks are about bots, so neither is reported as a field error: a
  // bot that learns which rule it tripped can adapt.
  const honeypot = typeof input.website === 'string' && input.website.trim() !== '';
  const elapsed = typeof input.elapsedMs === 'number' ? input.elapsedMs : 0;
  const tooFast = !Number.isFinite(elapsed) || elapsed < LIMITS.minFillMs;

  return {
    ok: true,
    submission: {
      name: name.value,
      email: email.value,
      message: message.value,
      token: token.value,
      suspicious: honeypot || tooFast,
    },
  };
}
