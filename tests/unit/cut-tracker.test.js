import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCutTracker, addPoint, endStroke, progress, isComplete, isOnTape, firstUncutX,
} from '../../js/tape/cut-tracker.js';

const LENGTH = 480;
const WIDTH = 48;
const fresh = () => createCutTracker({ length: LENGTH, width: WIDTH, bins: 48, threshold: 0.85 });

/** Drag along the tape centre from x0 to x1 in small steps. */
function drag(state, x0, x1, y = WIDTH / 2, step = 4) {
  let s = state;
  const dir = Math.sign(x1 - x0) || 1;
  for (let x = x0; dir > 0 ? x <= x1 : x >= x1; x += dir * step) {
    s = addPoint(s, { x, y }).state;
  }
  return endStroke(s);
}

test('a fresh tracker has no progress', () => {
  const s = fresh();
  assert.equal(progress(s), 0);
  assert.equal(isComplete(s), false);
});

test('pressing without moving cuts nothing', () => {
  const { state, cutLength } = addPoint(fresh(), { x: 100, y: 24 });
  assert.equal(progress(state), 0);
  assert.equal(cutLength, 0);
});

test('dragging half the tape cuts about half', () => {
  const s = drag(fresh(), 0, LENGTH / 2);
  assert.ok(progress(s) > 0.45 && progress(s) < 0.56, `progress ${progress(s)}`);
  assert.equal(isComplete(s), false);
});

test('retracing the same section does not add progress', () => {
  let s = drag(fresh(), 40, 200);
  const once = progress(s);
  for (let i = 0; i < 5; i += 1) s = drag(s, 200, 40);
  assert.equal(progress(s), once);
});

test('cutting works in either direction and completes', () => {
  const s = drag(fresh(), LENGTH, 0);
  assert.equal(isComplete(s), true);
  assert.equal(progress(s), 1);
});

test('most of the length is required, not all of it', () => {
  const s = drag(fresh(), 24, LENGTH - 24);
  assert.equal(isComplete(s), true);
  const short = drag(fresh(), 0, LENGTH * 0.7);
  assert.equal(isComplete(short), false);
});

test('leaving the tape pauses cutting and does not bridge the gap', () => {
  let s = fresh();
  s = addPoint(s, { x: 0, y: 24 }).state;
  s = addPoint(s, { x: 100, y: 24 }).state;
  s = addPoint(s, { x: 150, y: 400 }).state; // far off the tape
  const paused = progress(s);
  s = addPoint(s, { x: 400, y: 24 }).state; // re-enter far away
  assert.equal(progress(s), paused, 'no jump across the off-tape gap');
  s = addPoint(s, { x: 440, y: 24 }).state;
  assert.ok(progress(s) > paused, 'cutting resumes after re-entry');
});

test('a released stroke never connects to the next press', () => {
  let s = fresh();
  s = addPoint(s, { x: 0, y: 24 }).state;
  s = addPoint(s, { x: 50, y: 24 }).state;
  s = endStroke(s);
  const before = progress(s);
  s = addPoint(s, { x: 400, y: 24 }).state;
  assert.equal(progress(s), before);
});

test('points slightly outside the tape edge still count; far ones do not', () => {
  const config = fresh().config;
  assert.equal(isOnTape(config, { x: 10, y: -8 }), true);
  assert.equal(isOnTape(config, { x: 10, y: WIDTH + 8 }), true);
  assert.equal(isOnTape(config, { x: 10, y: -40 }), false);
  assert.equal(isOnTape(config, { x: -30, y: 24 }), false);
});

test('updates are immutable', () => {
  const s0 = fresh();
  const s1 = drag(s0, 0, 200);
  assert.equal(progress(s0), 0);
  assert.ok(Object.isFrozen(s1));
  assert.ok(Object.isFrozen(s1.cut));
  assert.ok(Object.isFrozen(s1.strokes));
});

test('records strokes for drawing the slit and reports cut length', () => {
  let s = fresh();
  s = addPoint(s, { x: 10, y: 20 }).state;
  const r = addPoint(s, { x: 40, y: 22 });
  assert.equal(r.cutLength, 30);
  assert.equal(r.state.strokes.length, 1);
  assert.equal(r.state.strokes[0].length, 2);
});

test('firstUncutX points at the first gap for keyboard cutting', () => {
  assert.equal(firstUncutX(fresh()), 0);
  const s = drag(fresh(), 0, 100);
  assert.ok(firstUncutX(s) >= 100 && firstUncutX(s) <= 110, `x ${firstUncutX(s)}`);
});
