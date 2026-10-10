/** Browser capabilities and preferences, read live so changes apply mid-visit. */

const query = (q) => (typeof matchMedia === 'function' ? matchMedia(q) : null);
const reducedMotionQuery = query('(prefers-reduced-motion: reduce)');
const finePointerQuery = query('(hover: hover) and (pointer: fine)');

export const prefersReducedMotion = () => Boolean(reducedMotionQuery?.matches);
export const hasFinePointer = () => Boolean(finePointerQuery?.matches);

/** Duration to use for an animation: zero when the visitor prefers less motion. */
export const motionMs = (ms) => (prefersReducedMotion() ? 0 : ms);

export function onMotionPreferenceChange(fn) {
  reducedMotionQuery?.addEventListener?.('change', () => fn(prefersReducedMotion()));
}

/**
 * localStorage wrapper. Storage can be unavailable (private windows, blocked
 * site data); preferences are a convenience, so failures fall back quietly
 * after a single console note.
 */
let storageWarned = false;
const warnStorage = (err) => {
  if (!storageWarned) console.info('[parcel] preferences will not be remembered:', err.message);
  storageWarned = true;
};

export const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      warnStorage(err);
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      warnStorage(err);
    }
  },
};

/**
 * Turn a site-relative path into a CSS url("…").
 * The path is made absolute first: a relative url() stored in a custom
 * property would otherwise resolve against the stylesheet that uses it
 * (css/), not against the page.
 */
export const cssUrl = (path) => {
  const absolute = new URL(String(path), document.baseURI).href;
  return `url("${absolute.replace(/["\\\n]/g, (c) => encodeURIComponent(c))}")`;
};
