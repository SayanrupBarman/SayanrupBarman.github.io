import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tween, easings, lerp } from '../../js/core/tween.js';

function fakeClock() {
  let t = 0;
  const queue = [];
  return {
    now: () => t,
    raf: (fn) => { queue.push(fn); return queue.length; },
    advance(ms) {
      t += ms;
      const due = queue.splice(0, queue.length);
      due.forEach((fn) => fn(t));
    },
  };
}

test('easings start at 0 and end at 1', () => {
  for (const [name, ease] of Object.entries(easings)) {
    assert.ok(Math.abs(ease(0)) < 1e-9, `${name}(0)`);
    assert.ok(Math.abs(ease(1) - 1) < 1e-9, `${name}(1)`);
  }
});

test('lerp interpolates', () => {
  assert.equal(lerp(10, 20, 0.5), 15);
});

test('tween reports progress and resolves at the end', async () => {
  const clock = fakeClock();
  const seen = [];
  const done = tween({ duration: 100, easing: easings.linear, onUpdate: (v) => seen.push(v), now: clock.now, raf: clock.raf });
  clock.advance(50);
  clock.advance(60);
  await done;
  assert.equal(seen.at(-1), 1);
  assert.ok(seen.some((v) => v > 0.4 && v < 0.6));
  for (let i = 1; i < seen.length; i += 1) assert.ok(seen[i] >= seen[i - 1]);
});

test('zero duration jumps straight to the end', async () => {
  const seen = [];
  await tween({ duration: 0, onUpdate: (v) => seen.push(v) });
  assert.deepEqual(seen, [1]);
});
