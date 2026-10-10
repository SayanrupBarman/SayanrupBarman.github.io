/** Tiny requestAnimationFrame tweening with easing. */

export const easings = Object.freeze({
  linear: (t) => t,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2),
  easeOutCubic: (t) => 1 - (1 - t) ** 3,
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutBack: (t) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
});

export const lerp = (a, b, t) => a + (b - a) * t;

const defaultNow = () => globalThis.performance.now();
const defaultRaf = (fn) => globalThis.requestAnimationFrame(fn);

/**
 * Animate from 0 to 1 over `duration` ms.
 * @param {{duration:number, easing?:Function, onUpdate:(eased:number, raw:number)=>void}} options
 * @returns {Promise<void>} resolves after the final frame (eased = 1)
 */
export function tween({ duration, easing = easings.easeInOutCubic, onUpdate, now = defaultNow, raf = defaultRaf }) {
  if (!(duration > 0)) {
    onUpdate(1, 1);
    return Promise.resolve();
  }
  const start = now();
  return new Promise((resolve) => {
    const frame = () => {
      const raw = Math.min(1, (now() - start) / duration);
      onUpdate(raw === 1 ? 1 : easing(raw), raw);
      if (raw < 1) raf(frame);
      else resolve();
    };
    raf(frame);
  });
}

/** Promise-based delay that collapses to zero when motion is reduced. */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
