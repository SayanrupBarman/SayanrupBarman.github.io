/**
 * Cutting interaction: mouse, pen and touch drags, plus a keyboard slider.
 *
 * Cutting happens only while a pointer is pressed, moving, and over the tape.
 * Releasing or wandering off the tape pauses (progress is kept) and silences
 * the cutting sound immediately.
 */

import {
  createCutTracker, addPoint, endStroke, progress, isComplete, firstUncutX,
} from './cut-tracker.js';
import { solveHomography, applyHomography } from '../geometry/homography.js';
import { BOX } from '../scene/geometry.js';
import { screenPoint } from '../scene/parcel.js';

const TAPE_RECT = [
  { x: 0, y: 0 }, { x: BOX.width, y: 0 }, { x: BOX.width, y: BOX.tapeWidth }, { x: 0, y: BOX.tapeWidth },
];
const SILENCE_AFTER_MS = 110; // knife stopped moving → sound stops
const KEY_STEP = 8; // tape pixels per key press / auto-repeat
const FORWARD_KEYS = new Set(['ArrowRight', 'ArrowUp', 'Enter', ' ']);
const BACKWARD_KEYS = new Set(['ArrowLeft', 'ArrowDown']);

const freshTracker = () => createCutTracker({ length: BOX.width, width: BOX.tapeWidth });

export function createCutting({
  stage, parcel, probes, view, sound, slider, knifeMarker, canCut, onStart, onProgress, onComplete,
}) {
  let tracker = freshTracker();
  let toTape = null;
  let toScreen = null;
  let activePointer = null;
  let lastTime = 0;
  let silenceTimer = 0;
  let keyX = null;
  let done = false;

  const measure = () => {
    const screen = probes.map(screenPoint);
    toTape = solveHomography(screen, TAPE_RECT);
    toScreen = solveHomography(TAPE_RECT, screen);
  };

  const quiet = () => {
    clearTimeout(silenceTimer);
    sound.stopLoop('cut');
    stage.classList.remove('is-cutting');
  };

  const updateSlider = () => {
    const pct = Math.round(progress(tracker) * 100);
    slider.setAttribute('aria-valuenow', String(pct));
    slider.setAttribute('aria-valuetext', `${pct}% of the tape cut`);
  };

  const release = () => {
    tracker = endStroke(tracker);
    if (activePointer !== null && stage.hasPointerCapture?.(activePointer)) stage.releasePointerCapture(activePointer);
    activePointer = null;
    stage.classList.remove('is-pressing');
    quiet();
  };

  const finish = () => {
    if (done) return;
    done = true;
    release();
    knifeMarker.hidden = true;
    onComplete();
  };

  /** Feed one point in tape coordinates; `elapsed` (ms) sets the sound level. */
  const feed = (point, elapsed) => {
    const { state, cutLength } = addPoint(tracker, point);
    tracker = state;
    if (cutLength <= 0) {
      if (!state.last) quiet();
      return;
    }
    onStart();
    view.render(tracker.strokes);
    const speed = cutLength / Math.max(8, elapsed);
    sound.loop('cut', Math.min(1, 0.35 + speed));
    stage.classList.add('is-cutting');
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(quiet, SILENCE_AFTER_MS);
    updateSlider();
    onProgress(progress(tracker));
    if (isComplete(tracker)) finish();
  };

  // ── pointer (mouse, pen, touch) ────────────────────────────────────────
  const onPointerDown = (e) => {
    if (done || !canCut() || activePointer !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!parcel.contains(e.target)) return;
    measure();
    if (!toTape) return;
    try {
      stage.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn('[parcel] could not follow this pointer:', err.message);
      return;
    }
    activePointer = e.pointerId;
    stage.classList.add('is-pressing');
    lastTime = e.timeStamp;
    e.preventDefault();
    const p = applyHomography(toTape, { x: e.clientX, y: e.clientY });
    if (p) feed(p, 16);
  };

  const onPointerMove = (e) => {
    if (e.pointerId !== activePointer) return;
    if (e.pointerType === 'mouse' && (e.buttons & 1) === 0) {
      release();
      return;
    }
    const coalesced = e.getCoalescedEvents?.() ?? [];
    for (const sample of coalesced.length ? coalesced : [e]) {
      const p = applyHomography(toTape, { x: sample.clientX, y: sample.clientY });
      if (p) feed(p, sample.timeStamp - lastTime);
      lastTime = sample.timeStamp;
      if (done) return;
    }
  };

  const onPointerEnd = (e) => {
    if (e.pointerId === activePointer) release();
  };

  // ── keyboard ───────────────────────────────────────────────────────────
  const showKnife = () => {
    if (!toScreen || keyX === null) return;
    const at = applyHomography(toScreen, { x: keyX, y: BOX.tapeWidth / 2 });
    if (!at) return;
    knifeMarker.style.transform = `translate(${at.x}px, ${at.y}px)`;
    knifeMarker.hidden = false;
  };

  const onKeyDown = (e) => {
    const forward = FORWARD_KEYS.has(e.key);
    if (done || !canCut() || (!forward && !BACKWARD_KEYS.has(e.key))) return;
    e.preventDefault();
    sound.unlock();
    measure();
    if (keyX === null) keyX = firstUncutX(tracker);
    if (!tracker.last) feed({ x: keyX, y: BOX.tapeWidth / 2 }, 16);
    keyX = Math.min(BOX.width, Math.max(0, keyX + (forward ? KEY_STEP : -KEY_STEP)));
    // A little wobble so a keyboard cut still looks hand-made.
    feed({ x: keyX, y: BOX.tapeWidth / 2 + Math.sin(keyX * 0.09) * 2 }, 45);
    showKnife();
  };

  const onKeyUp = () => {
    tracker = endStroke(tracker);
    quiet();
  };

  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', onPointerEnd);
  stage.addEventListener('pointercancel', onPointerEnd);
  stage.addEventListener('lostpointercapture', onPointerEnd);
  slider.addEventListener('keydown', onKeyDown);
  slider.addEventListener('keyup', onKeyUp);
  slider.addEventListener('focus', () => {
    measure();
    if (keyX === null) keyX = firstUncutX(tracker);
    showKnife();
  });
  slider.addEventListener('blur', () => { knifeMarker.hidden = true; onKeyUp(); });

  return {
    progress: () => progress(tracker),
    /** Skip straight to "cut" (used by ?jump= previews). */
    markDone: () => { done = true; release(); },
    reset() {
      release();
      tracker = freshTracker();
      keyX = null;
      done = false;
      knifeMarker.hidden = true;
      view.reset();
      updateSlider();
    },
  };
}
