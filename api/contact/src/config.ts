/**
 * Builds the handler from environment variables - the only place that reads
 * them. Shared by the Lambda entry point and the local API, so both start
 * from the same configuration rules and fail the same way when one is
 * missing.
 *
 *   MAIL_TRANSPORT               console | ses
 *   MAIL_FROM                    verified SES sender
 *   MAIL_TO                      the one recipient
 *   TURNSTILE_SECRET             literal secret (local, dummy keys)
 *   TURNSTILE_SECRET_PARAMETER   SSM SecureString name (Lambda)
 *   TURNSTILE_HOSTNAME           optional; required hostname of the challenge
 */
import { createHandler } from './handler.ts';
import { createTransport } from './mail.ts';
import { createSecretLoader } from './secret.ts';

type Env = Record<string, string | undefined>;

function required(env: Env, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

export function handlerFromEnv(env: Env) {
  return createHandler({
    from: required(env, 'MAIL_FROM'),
    to: required(env, 'MAIL_TO'),
    expectedHostname: env.TURNSTILE_HOSTNAME || undefined,
    loadSecret: createSecretLoader({
      value: env.TURNSTILE_SECRET,
      parameterName: env.TURNSTILE_SECRET_PARAMETER,
    }),
    send: createTransport(env.MAIL_TRANSPORT, env),
  });
}
