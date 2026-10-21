/**
 * Limits shared by the handler and the form. The site imports this file
 * directly, so the textarea's maxlength and the server's check can never
 * disagree. Lengths are UTF-16 code units, which is what HTML's maxlength
 * counts and what String.length returns.
 */
export const LIMITS = {
  nameMax: 100,
  // RFC 5321's path limit, less the angle brackets.
  emailMax: 254,
  messageMax: 5000,
  // Siteverify rejects longer tokens anyway; this fails before the network.
  tokenMax: 2048,
  /** Whole request body, in bytes. Fields at their maxima fit with room. */
  bodyMaxBytes: 32 * 1024,
  /**
   * A human needs longer than this to fill three fields. A cheap filter for
   * naive bots only: the elapsed time is reported by the client, so it can be
   * forged. Turnstile is the real gate.
   */
  minFillMs: 3000,
} as const;
