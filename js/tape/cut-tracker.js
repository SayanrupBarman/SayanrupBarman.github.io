/**
 * Immutable record of how much of the tape has been cut.
 *
 * The tape length is divided into equal bins. A bin counts as cut only when a
 * pressed pointer moves across it while on the tape, so scrubbing back and
 * forth over one spot never completes the task. Every update returns a new
 * frozen state; nothing is mutated in place.
 */

export const DEFAULTS = Object.freeze({
  bins: 48,
  threshold: 0.85,
  /** How far outside the tape's edges (as a fraction of its width) still counts. */
  tolerance: 0.3,
  /** Ignore jitter smaller than this many tape pixels. */
  minMove: 0.75,
});

const freezeAll = (state) => Object.freeze({
  ...state,
  cut: Object.freeze(state.cut),
  strokes: Object.freeze(state.strokes),
});

export function createCutTracker(options) {
  const config = Object.freeze({ ...DEFAULTS, ...options });
  if (!(config.length > 0) || !(config.width > 0)) throw new Error('Tape needs a positive length and width');
  return freezeAll({
    config,
    cut: Array(config.bins).fill(false),
    strokes: [],
    last: null,
  });
}

export function isOnTape(config, p) {
  const margin = config.width * config.tolerance;
  return p.x >= 0 && p.x <= config.length && p.y >= -margin && p.y <= config.width + margin;
}

const binAt = (config, x) => Math.min(config.bins - 1, Math.max(0, Math.floor((x / config.length) * config.bins)));

/** Mark every bin between two x positions (inclusive) as cut. */
function markBetween(cut, config, x0, x1) {
  const lo = binAt(config, Math.min(x0, x1));
  const hi = binAt(config, Math.max(x0, x1));
  return cut.map((done, i) => done || (i >= lo && i <= hi));
}

/**
 * Feed one pointer sample (in tape coordinates) while the button is held.
 * @returns {{state: object, cutLength: number}} cutLength > 0 means the knife is actively cutting
 */
export function addPoint(state, p) {
  const { config, last } = state;
  if (!isOnTape(config, p)) {
    return { state: last ? endStroke(state) : state, cutLength: 0 };
  }
  if (!last) {
    const strokes = [...state.strokes, Object.freeze([Object.freeze({ ...p })])];
    return { state: freezeAll({ ...state, strokes, last: { ...p } }), cutLength: 0 };
  }
  const moved = Math.hypot(p.x - last.x, p.y - last.y);
  if (moved < config.minMove) return { state, cutLength: 0 };

  const cut = markBetween(state.cut, config, last.x, p.x);
  const current = state.strokes.at(-1);
  const strokes = [...state.strokes.slice(0, -1), Object.freeze([...current, Object.freeze({ ...p })])];
  return {
    state: freezeAll({ ...state, cut, strokes, last: { ...p } }),
    cutLength: Math.abs(p.x - last.x),
  };
}

/** Pointer released or left the tape: pause, keeping progress. */
export function endStroke(state) {
  return state.last ? freezeAll({ ...state, last: null }) : state;
}

export function progress(state) {
  return state.cut.filter(Boolean).length / state.config.bins;
}

export function isComplete(state) {
  return progress(state) >= state.config.threshold;
}

/** Left edge (tape px) of the first uncut bin — where keyboard cutting resumes. */
export function firstUncutX(state) {
  const i = state.cut.indexOf(false);
  const index = i === -1 ? state.config.bins : i;
  return (index / state.config.bins) * state.config.length;
}
