/**
 * The Turnstile secret, from wherever this environment keeps it.
 *
 * In Lambda it is an SSM SecureString, created by hand so it never touches
 * code or Terraform state. It is fetched on first use and kept in module
 * scope for SECRET_MAX_AGE_MS, so an execution environment calls
 * GetParameter at most once per window, not once per request. The window is
 * what lets a rotated secret take effect without a redeploy: Cloudflare keeps
 * the old one valid for two hours, and execution environments can outlive
 * that. A failed fetch is not cached: the next request tries again.
 *
 * Locally, TURNSTILE_SECRET holds one of Cloudflare's dummy secrets and no
 * AWS call is made at all.
 */
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

/** How long a fetched secret is reused before it is read again. */
export const SECRET_MAX_AGE_MS = 5 * 60 * 1000;

export type ParameterReader = (name: string) => Promise<string>;

const readFromSsm: ParameterReader = async (name) => {
  const client = new SSMClient({});
  const { Parameter } = await client.send(
    new GetParameterCommand({ Name: name, WithDecryption: true }),
  );
  if (!Parameter?.Value) {
    throw new Error(`SSM parameter ${name} has no value`);
  }
  return Parameter.Value;
};

export interface SecretSource {
  /** A literal secret. Takes precedence; for local development. */
  value?: string;
  /** Name of the SecureString parameter holding it. */
  parameterName?: string;
  read?: ParameterReader;
  maxAgeMs?: number;
  now?: () => number;
}

export function createSecretLoader(source: SecretSource): () => Promise<string> {
  if (source.value) {
    const value = source.value;
    return () => Promise.resolve(value);
  }
  const { parameterName } = source;
  if (!parameterName) {
    throw new Error('Set TURNSTILE_SECRET (local) or TURNSTILE_SECRET_PARAMETER (Lambda).');
  }

  const read = source.read ?? readFromSsm;
  const maxAgeMs = source.maxAgeMs ?? SECRET_MAX_AGE_MS;
  const now = source.now ?? Date.now;
  let pending: Promise<string> | null = null;
  let fetchedAt = 0;

  return () => {
    if (pending && now() - fetchedAt >= maxAgeMs) pending = null;
    if (!pending) {
      fetchedAt = now();
      pending = read(parameterName).catch((error: unknown) => {
        pending = null;
        throw error;
      });
    }
    return pending;
  };
}
