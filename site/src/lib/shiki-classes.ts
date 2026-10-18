/**
 * Shiki transformer: every inline style Shiki (and Astro's own Shiki
 * transformer) writes becomes a class, styled by styles/shiki.css.
 *
 * Why: the CSP has no 'unsafe-hashes', so the browser drops any style=""
 * attribute. Shiki colours each token with one, and the old fix - hashing
 * every distinct value into the CSP - meant a post with a new token colour
 * changed the CloudFront headers policy, so content deploys waited on a
 * Terraform apply. Classes come from a stylesheet, which 'self' covers, so
 * no post can ever change the CSP again.
 *
 * Class names are derived from the declaration, not hashed:
 *   color:#F97583            -> sh-f97583
 *   background-color:#86181d -> sh-bg-86181d
 *   font-style:italic        -> sh-italic
 * so styles/shiki.css can be written once for the whole theme palette, and
 * shiki-classes.test.mjs checks it covers every colour github-dark can emit.
 *
 * An unknown declaration throws, failing the build, rather than leaving a
 * style="" behind for the CSP to silently strip in production.
 */
import type { ShikiTransformer } from 'shiki';

const FIXED: Record<string, string[]> = {
  'font-style:italic': ['sh-italic'],
  'font-weight:bold': ['sh-bold'],
  'text-decoration:underline': ['sh-underline'],
  'text-decoration:line-through': ['sh-line-through'],
  'text-decoration:underline line-through': ['sh-underline', 'sh-line-through'],
  // Astro's transformer: wraps the "+"/"-" of diff lines, and scrolls <pre>.
  'user-select:none': ['sh-no-select'],
  'overflow-x:auto': ['sh-scroll'],
};

const HEX = /^#([0-9a-f]{3,8})$/i;

/** The classes one `property:value` declaration maps to. */
export function classesFor(declaration: string): string[] {
  const unmapped = new Error(
    `Shiki emitted a style with no class mapping: "${declaration}". ` +
      'Add it to site/src/lib/shiki-classes.ts and styles/shiki.css.',
  );
  const separator = declaration.indexOf(':');
  if (separator <= 0) {
    throw unmapped;
  }
  const property = declaration.slice(0, separator).trim().toLowerCase();
  const value = declaration
    .slice(separator + 1)
    .trim()
    .replace(/\s+/g, ' ');

  const hex = HEX.exec(value)?.[1]?.toLowerCase();
  if (property === 'color' && hex) {
    return [`sh-${hex}`];
  }
  if (property === 'background-color' && hex) {
    return [`sh-bg-${hex}`];
  }

  const fixed = FIXED[`${property}:${value.toLowerCase()}`];
  if (fixed) {
    return fixed;
  }
  throw unmapped;
}

/** The classes a whole style attribute maps to, deduplicated. */
export function classesForStyle(style: string): string[] {
  const declarations = style
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  return [...new Set(declarations.flatMap(classesFor))];
}

type Node = {
  type: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

function convert(node: Node): void {
  const properties = node.properties;
  const style = properties?.style;
  if (properties && typeof style === 'string') {
    const existing = properties.class;
    const current = Array.isArray(existing)
      ? existing.map(String)
      : typeof existing === 'string'
        ? existing.split(/\s+/).filter(Boolean)
        : [];
    properties.class = [...new Set([...current, ...classesForStyle(style)])].join(' ');
    delete properties.style;
  }
  node.children?.forEach(convert);
}

export function shikiStyleToClass(): ShikiTransformer {
  return {
    name: 'portfolio:style-to-class',
    // root runs last, after Astro's own pre/line hooks have added theirs.
    root(tree) {
      convert(tree as Node);
    },
  };
}
