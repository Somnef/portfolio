import config from '../config/avatar.json';

/**
 * Drives the pixel avatar beside the journey timeline.
 *
 * Everything here is enhancement. Without it the CSS still paints a single
 * static idle frame, which is also the presentation the reduced-motion branch
 * is meant to produce.
 *
 * Two rules shape the implementation:
 *   - Scroll handlers are passive and only record state. Every DOM write
 *     happens in a requestAnimationFrame callback, so scrolling never
 *     triggers synchronous layout.
 *   - Nothing reads layout at all after the initial setup, so there is no
 *     read-write interleaving to thrash on.
 */

type Mode = 'idle' | 'walk';

function init(): void {
  const avatar = document.querySelector<HTMLElement>('[data-avatar]');
  const journey = document.getElementById('journey');
  if (!avatar || !journey) return;
  start(avatar);
}

function start(avatar: HTMLElement): void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let mode: Mode = 'idle';
  let facing: 'down' | 'up' = 'down';
  let variant = config.defaultVariant;

  let lastScrollAt = 0;
  let lastY = window.scrollY;
  let frameQueued = false;
  let dirty = true;

  // Frame geometry comes from the config rather than the stylesheet, so
  // changing the sprite dimensions is a JSON edit.
  avatar.style.setProperty('--frame-w', `${config.frameWidth}px`);
  avatar.style.setProperty('--frame-h', `${config.frameHeight}px`);

  function paint(): void {
    frameQueued = false;

    if (dirty) {
      dirty = false;
      const animation = config.animations[mode];
      avatar.dataset.mode = mode;
      avatar.dataset.facing = facing;
      // Reflected for styling hooks and so the current era is inspectable in
      // devtools, not just implied by the background URL.
      avatar.dataset.variant = variant;
      avatar.style.setProperty('--sprite-frames', String(animation.frames));
      avatar.style.setProperty('--sprite-duration', `${animation.durationMs}ms`);
      avatar.style.setProperty('--sprite-sheet', `url('/sprites/${variant}/${mode}.png')`);
    }

    // Keep ticking only while walking, so an idle page costs nothing.
    if (mode === 'walk') {
      if (performance.now() - lastScrollAt >= config.idleAfterMs) {
        mode = 'idle';
        dirty = true;
      }
      queue();
    }
  }

  function queue(): void {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(paint);
  }

  window.addEventListener(
    'scroll',
    () => {
      // Reading scrollY inside the scroll event is safe: layout is already
      // settled at this point. All writes are deferred to paint().
      const y = window.scrollY;
      if (y !== lastY) {
        const next = y > lastY ? 'down' : 'up';
        if (next !== facing) {
          facing = next;
          dirty = true;
        }
        lastY = y;
      }

      lastScrollAt = performance.now();

      // Under reduced motion the avatar never walks - it stays on the static
      // idle frame, which is the whole point of the preference.
      if (!reducedMotion.matches && mode !== 'walk') {
        mode = 'walk';
        dirty = true;
      }

      queue();
    },
    { passive: true },
  );

  // Changing the preference mid-session should take effect immediately.
  reducedMotion.addEventListener('change', (event) => {
    if (event.matches && mode !== 'idle') {
      mode = 'idle';
      dirty = true;
      queue();
    }
  });

  /*
   * Era variants. Each timeline entry may name a sprite variant; the avatar
   * adopts the one belonging to the entry nearest the top of the viewport.
   * Entries without a variant leave the current one in place, so the sprite
   * changes at the boundaries that matter rather than flickering.
   *
   * A variant naming a folder that does not exist simply paints nothing,
   * which is the intended graceful degradation.
   */
  const entries = Array.from(document.querySelectorAll<HTMLElement>('[data-avatar-variant]'));

  if (entries.length > 0 && 'IntersectionObserver' in window) {
    const visible = new Set<HTMLElement>();

    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          const el = record.target as HTMLElement;
          if (record.isIntersecting) visible.add(el);
          else visible.delete(el);
        }

        // DOM order is chronological, so the first visible entry is the era
        // the reader is looking at.
        const current = entries.find((el) => visible.has(el));
        const next = current?.dataset.avatarVariant;

        if (next && next !== variant) {
          variant = next;
          dirty = true;
          queue();
        }
      },
      // A band across the middle of the viewport, so the variant changes when
      // an era reaches the reader rather than when it merely appears.
      { rootMargin: '-35% 0px -45% 0px' },
    );

    for (const el of entries) observer.observe(el);
  }

  queue();
}

init();
