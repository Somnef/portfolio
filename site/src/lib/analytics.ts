/**
 * Analytics hook.
 *
 * Phase 1 ships no analytics: CloudFront's own console reports cover it, and
 * there are no cookies. This exists so the call sites are marked now and
 * enabling a provider later is a config change rather than a hunt through the
 * codebase for the right places.
 *
 * `track()` is a no-op while no provider is configured. Nothing imports it
 * into the browser yet, so this costs zero bytes in the shipped output - the
 * marked elements carry a `data-track` attribute and a provider script would
 * read those.
 */

export type TrackEvent = 'cv_download' | 'contact_success';

export function track(event: TrackEvent, properties?: Record<string, string>): void {
  // No provider configured: deliberately does nothing.
  // When one is enabled, this is the single place that forwards the event.
  void event;
  void properties;
}
