/**
 * Preload artwork and fonts before the parcel appears.
 *
 * Each image has the owner's path and a placeholder fallback. If the owner's
 * file is missing (typo, not uploaded yet), the placeholder is used and a
 * warning names the exact path, so the site never shows broken images.
 */

const LOAD_TIMEOUT_MS = 15000;

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      // decode() keeps the first frame of an animation from stuttering.
      (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).finally(() => resolve(img));
    };
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function resolveImage({ key, src, fallback }) {
  const candidates = [src, fallback].filter((s, i, all) => s && all.indexOf(s) === i);
  for (const candidate of candidates) {
    try {
      await loadImage(candidate);
      if (candidate !== src && src) console.warn(`[parcel] "${key}": ${src} is missing — showing the placeholder instead.`);
      return { key, src: candidate };
    } catch (err) {
      if (candidate === candidates.at(-1)) console.error(`[parcel] "${key}":`, err.message);
    }
  }
  return { key, src: null };
}

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((resolve) => setTimeout(() => resolve('timeout'), ms)),
]);

/**
 * @param {{images:{key:string,src:string,fallback?:string}[], tasks?:Promise[], onProgress?:(f:number)=>void}} plan
 * @returns {Promise<Record<string,string|null>>} resolved src per image key
 */
export async function preload({ images, tasks = [], onProgress = () => {} }) {
  const total = images.length + tasks.length;
  let done = 0;
  const tick = (value) => {
    done += 1;
    onProgress(done / total);
    return value;
  };
  const work = Promise.all([
    ...images.map((img) => resolveImage(img).then(tick)),
    ...tasks.map((t) => Promise.resolve(t).catch((err) => console.warn('[parcel]', err)).then(tick)),
  ]);
  const outcome = await withTimeout(work, LOAD_TIMEOUT_MS);
  if (outcome === 'timeout') {
    console.warn('[parcel] loading is slow; starting anyway.');
    return Object.fromEntries(images.map((img) => [img.key, img.src || img.fallback || null]));
  }
  return Object.fromEntries(outcome.filter(Boolean).filter((r) => r.key).map((r) => [r.key, r.src]));
}

/** Load the owner's handwriting font, if one is configured. */
export async function loadHandwritingFont(url) {
  if (!url || typeof FontFace !== 'function') return false;
  try {
    const face = new FontFace('Owner Hand', `url("${url}")`);
    document.fonts.add(await face.load());
    return true;
  } catch (err) {
    console.warn(`[parcel] handwriting font ${url} could not be loaded; using Caveat.`, err.message);
    return false;
  }
}
