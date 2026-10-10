/**
 * The experience as a small finite-state machine.
 *
 * Stable stages wait for the visitor; "busy" stages are animations that ignore
 * input until they finish. That single rule is what prevents overlapping
 * transitions and double activation (e.g. clicking the book twice).
 */

export const STATES = Object.freeze({
  LOADING: 'loading',
  SEALED: 'sealed',
  CUTTING: 'cutting',
  OPENING: 'opening',
  DARK: 'dark',
  REVEALING: 'revealing',
  OVERHEAD: 'overhead',
  LIFTING: 'lifting',
  READING: 'reading',
  CLOSING: 'closing',
});

const S = STATES;

const BUSY = new Set([S.LOADING, S.OPENING, S.REVEALING, S.LIFTING, S.CLOSING]);

const TRANSITIONS = Object.freeze({
  [S.LOADING]: { LOADED: S.SEALED },
  [S.SEALED]: { CUT_START: S.CUTTING, RESTART: S.SEALED },
  [S.CUTTING]: { CUT_DONE: S.OPENING, RESTART: S.SEALED },
  [S.OPENING]: { OPENED: S.DARK },
  [S.DARK]: { REVEAL: S.REVEALING, RESTART: S.SEALED },
  [S.REVEALING]: { REVEALED: S.OVERHEAD },
  [S.OVERHEAD]: { OPEN_BOOK: S.LIFTING, RESTART: S.SEALED },
  [S.LIFTING]: { BOOK_OPENED: S.READING },
  [S.READING]: { CLOSE_BOOK: S.CLOSING, RESTART: S.SEALED },
  [S.CLOSING]: { BOOK_CLOSED: S.OVERHEAD },
});

/** Pure transition lookup: the next state, or null when the event is not allowed. */
export function nextState(state, event) {
  return TRANSITIONS[state]?.[event] ?? null;
}

export function isBusyState(state) {
  return BUSY.has(state);
}

export function createMachine(initial = S.LOADING) {
  let state = initial;
  let listeners = [];

  const send = (event) => {
    const to = nextState(state, event);
    if (to === null) return false;
    const from = state;
    state = to;
    listeners.forEach((fn) => fn(to, from, event));
    return true;
  };

  /**
   * Enter a busy state, run its animation, then leave it.
   * Returns false (and runs nothing) when the start event is not allowed —
   * which is exactly what happens on a double click.
   */
  const perform = async (startEvent, task, endEvent, { onError = console.error } = {}) => {
    if (!send(startEvent)) return false;
    try {
      await task();
    } catch (err) {
      onError(err);
    }
    send(endEvent);
    return true;
  };

  return {
    get state() { return state; },
    isBusy: () => isBusyState(state),
    can: (event) => nextState(state, event) !== null,
    send,
    perform,
    subscribe(fn) {
      listeners = [...listeners, fn];
      return () => { listeners = listeners.filter((l) => l !== fn); };
    },
  };
}
