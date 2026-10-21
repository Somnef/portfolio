/**
 * Server-side Turnstile verification. The widget's token proves nothing
 * until Siteverify has accepted it, and each token is accepted only once.
 *
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface VerifyOptions {
  secret: string;
  token: string;
  /** Visitor IP. Optional for Siteverify; sent when known. */
  remoteIp?: string;
  /**
   * When set, the challenge must have been solved on this hostname. Guards
   * against a token minted on another site that uses the same widget.
   * Unset locally: Cloudflare's dummy keys report example.com.
   */
  expectedHostname?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export type VerifyResult =
  | { ok: true }
  /** Cloudflare answered and said no: the visitor's problem, a 403. */
  | { ok: false; reason: 'rejected'; codes: string[] }
  /** Cloudflare could not be asked: our problem, a 503. */
  | { ok: false; reason: 'unavailable'; codes: string[] };

interface SiteverifyResponse {
  success?: boolean;
  hostname?: string;
  'error-codes'?: string[];
}

// The error code Cloudflare documents as worth retrying, alongside no answer
// at all. Everything else (invalid, expired, duplicate token) is final.
const RETRYABLE = new Set(['internal-error']);

async function attempt(
  options: VerifyOptions,
  idempotencyKey: string,
): Promise<SiteverifyResponse | null> {
  const fetchImpl = options.fetch ?? fetch;
  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        secret: options.secret,
        response: options.token,
        ...(options.remoteIp ? { remoteip: options.remoteIp } : {}),
        idempotency_key: idempotencyKey,
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
    });
    if (!response.ok) return null;
    return (await response.json()) as SiteverifyResponse;
  } catch {
    // Timeout, DNS, TLS, non-JSON body: all mean "could not ask".
    return null;
  }
}

export async function verifyTurnstile(options: VerifyOptions): Promise<VerifyResult> {
  // One key for both attempts, so a retry after a lost response is not
  // rejected as a duplicate of the first.
  const idempotencyKey = crypto.randomUUID();

  let result = await attempt(options, idempotencyKey);
  const retry =
    result === null || (result['error-codes'] ?? []).some((code) => RETRYABLE.has(code));
  if (retry) {
    result = await attempt(options, idempotencyKey);
  }

  if (result === null) {
    return { ok: false, reason: 'unavailable', codes: [] };
  }

  const codes = result['error-codes'] ?? [];
  if (result.success !== true) {
    const unavailable = codes.some((code) => RETRYABLE.has(code) || code.includes('secret'));
    return { ok: false, reason: unavailable ? 'unavailable' : 'rejected', codes };
  }

  if (options.expectedHostname && result.hostname !== options.expectedHostname) {
    return { ok: false, reason: 'rejected', codes: ['hostname-mismatch'] };
  }

  return { ok: true };
}
