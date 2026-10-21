/**
 * Lambda entry point (handler setting: index.handler). Configuration is read
 * once per execution environment, at cold start, so a missing variable fails
 * the first invocation loudly instead of every request quietly.
 */
import { handlerFromEnv } from './config.ts';

export const handler = handlerFromEnv(process.env);
