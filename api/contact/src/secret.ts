/**
 * The Turnstile secret, from wherever this environment keeps it.
 *
 * In Lambda it is an SSM SecureString, created by hand so it never touches
 * code or Terraform state. It is fetched on first use and the promise is kept
 * in module scope, so each execution environment calls GetParameter once,
 * not once per request. A failed fetch is not cached: the next request
 * tries again.
 *
 * Locally, TURNSTILE_SECRET holds one of Cloudflare's dummy secrets and no
 * AWS call is made at all.
 */
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

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
  let pending: Promise<string> | null = null;

  return () => {
    pending ??= read(parameterName).catch((error: unknown) => {
      pending = null;
      throw error;
    });
    return pending;
  };
}
