/**
 * Non-translatable site configuration: the links that are the same in every
 * language. Translatable strings (role, tagline, labels) live in src/i18n/.
 *
 * No personal email here - the repo is public. The contact address is a
 * Terraform variable, read only by the contact Lambda.
 */
export const site = {
  github: 'https://github.com/Somnef',
  linkedin: 'https://www.linkedin.com/in/moncefbousselat/',
} as const;
