/**
 * The Turnstile secret, from wherever this environment keeps it.
 *
 * In Lambda it is an SSM SecureString, created by hand so it never touches
 * code or Terraform state. It is read on every request that reaches the
 * Turnstile check, with no cache, so a rotated secret takes effect on the
 * next request. API Gateway's throttle and the reserved concurrency already
 * bound how often that can happen.
 *
 * Locally, TURNSTILE_SECRET holds one of Cloudflare's dummy secrets and no
 * AWS call is made at all.
 */
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

export type ParameterReader = (name: string) => Promise<string>;

// The client, not the secret, is kept across requests: it holds the
// connection pool and the credentials.
let ssm: SSMClient | undefined;

const readFromSsm: ParameterReader = async (name) => {
  ssm ??= new SSMClient({});
  const { Parameter } = await ssm.send(
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
  return () => read(parameterName);
}
