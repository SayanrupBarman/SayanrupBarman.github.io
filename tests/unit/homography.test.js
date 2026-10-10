import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveHomography, applyHomography } from '../../js/geometry/homography.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const square = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];

test('identity mapping keeps points in place', () => {
  const h = solveHomography(square, square);
  const p = applyHomography(h, { x: 0.3, y: 0.7 });
  close(p.x, 0.3);
  close(p.y, 0.7);
});

test('maps a scaled and translated rectangle', () => {
  const dst = [{ x: 10, y: 20 }, { x: 410, y: 20 }, { x: 410, y: 80 }, { x: 10, y: 80 }];
  const h = solveHomography(square, dst);
  const p = applyHomography(h, { x: 0.5, y: 0.5 });
  close(p.x, 210);
  close(p.y, 50);
});

test('inverts a perspective quad back to tape space', () => {
  // A strip seen in perspective: far end is narrower.
  const screen = [{ x: 100, y: 300 }, { x: 500, y: 120 }, { x: 515, y: 140 }, { x: 125, y: 335 }];
  const tape = [{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 56 }, { x: 0, y: 56 }];
  const h = solveHomography(screen, tape);
  screen.forEach((corner, i) => {
    const p = applyHomography(h, corner);
    close(p.x, tape[i].x, 1e-6);
    close(p.y, tape[i].y, 1e-6);
  });
  const back = solveHomography(tape, screen);
  const mid = applyHomography(back, { x: 300, y: 28 });
  const roundTrip = applyHomography(h, mid);
  close(roundTrip.x, 300, 1e-6);
  close(roundTrip.y, 28, 1e-6);
});

test('returns null for degenerate (collinear) corners', () => {
  const line = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
  assert.equal(solveHomography(line, square), null);
});

test('rejects missing input', () => {
  assert.equal(solveHomography([], square), null);
  assert.equal(applyHomography(null, { x: 0, y: 0 }), null);
});
