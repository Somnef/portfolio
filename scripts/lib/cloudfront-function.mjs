/**
 * Loads a CloudFront Function file the way the edge runtime sees it: as a
 * plain script with a top-level `handler`, not as a module.
 *
 * Used by the function's unit tests and by the local preview server, so both
 * exercise the exact file Terraform uploads rather than a copy of it.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export function loadHandler(path) {
  const context = vm.createContext({});
  vm.runInContext(readFileSync(path, 'utf8'), context, { filename: path });

  if (typeof context.handler !== 'function') {
    throw new Error(`${path} does not define a top-level handler(event)`);
  }

  return context.handler;
}
