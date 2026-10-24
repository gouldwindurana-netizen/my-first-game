/** Browser compatibility helpers; gameplay state stays with the caller. */
export interface PlatformLifecycleOptions {
  /** Pause the current match when the browser stops displaying it. */
  onHide: () => void;
  /** Follow a changed OS preference without assuming that the match should resume. */
  onMotionChange?: (reduced: boolean) => void;
}

export function installPlatformLifecycle(options: PlatformLifecycleOptions): () => void {
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') options.onHide();
  };
  const onPageHide = () => options.onHide();
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotionChange = (event: MediaQueryListEvent) => options.onMotionChange?.(event.matches);

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
  // Older iOS Safari exposes MediaQueryList's legacy listener methods only.
  if (typeof motion.addEventListener === 'function') motion.addEventListener('change', onMotionChange);
  else motion.addListener(onMotionChange);

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', onPageHide);
    if (typeof motion.removeEventListener === 'function') motion.removeEventListener('change', onMotionChange);
    else motion.removeListener(onMotionChange);
  };
}

/** Safari's prefixed constructor is still used by some embedded mobile browsers. */
export function getAudioContextConstructor(): typeof AudioContext | undefined {
  const compatibleWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  return compatibleWindow.AudioContext ?? compatibleWindow.webkitAudioContext;
}

/** Keep a tower tap from jumping the document to the canvas on older Safari. */
export function focusBattlefield(): void {
  const field = document.getElementById('battlefield');
  if (!field) return;
  const left = window.scrollX;
  const top = window.scrollY;
  try {
    field.focus({ preventScroll: true });
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    field.focus();
  }
  if (window.scrollX !== left || window.scrollY !== top) window.scrollTo(left, top);
}
