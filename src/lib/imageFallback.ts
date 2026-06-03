/**
 * Global image error handler — guarantees no <img> ever leaves a broken/blank
 * placeholder that visually "deletes" a frame. Falls back to the SETVOID logo,
 * then to a neutral placeholder, then to a transparent pixel.
 */

const FALLBACK_CHAIN = [
  '/SETVOIDUI.png',
  '/setvoid.png',
  '/placeholder.svg',
];

const TRANSPARENT_PX =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';

export function installGlobalImageFallback() {
  if (typeof window === 'undefined') return;
  if ((window as any).__setvoidImgFallbackInstalled) return;
  (window as any).__setvoidImgFallbackInstalled = true;

  const handle = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target || target.tagName !== 'IMG') return;
    const img = target as HTMLImageElement;

    const tried: string[] = (img as any).__triedFallbacks || [];
    (img as any).__triedFallbacks = tried;

    // Avoid infinite loops if the current src is already a fallback
    const current = img.getAttribute('src') || '';
    if (tried.includes(current)) {
      // move to next in chain
    } else {
      tried.push(current);
    }

    const next = FALLBACK_CHAIN.find((url) => !tried.includes(url));
    if (next) {
      tried.push(next);
      img.src = next;
      return;
    }

    // Last resort: keep the element visible with a neutral pixel + min size,
    // so the surrounding frame never collapses.
    img.src = TRANSPARENT_PX;
    img.style.background = 'hsl(var(--muted))';
    if (!img.style.minWidth) img.style.minWidth = '24px';
    if (!img.style.minHeight) img.style.minHeight = '24px';
  };

  // Use capture phase — `error` does NOT bubble for <img>.
  window.addEventListener('error', handle, true);
}
