import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOX, frameFor, tapeCorners, rimMagnification } from '../../js/scene/geometry.js';

const screens = [
  { width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 },
  { width: 844, height: 390 }, { width: 320, height: 568 },
];

test('the overhead view keeps the whole box rim on screen', () => {
  for (const s of screens) {
    const f = frameFor('overhead', s.width, s.height);
    const m = rimMagnification(f);
    assert.ok(BOX.width * f.zoom * m <= s.width, `rim width fits ${s.width}x${s.height}`);
    assert.ok(BOX.depth * f.zoom * m <= s.height, `rim depth fits ${s.width}x${s.height}`);
  }
});

test('the overhead view is a closer look than the three-quarter view', () => {
  for (const s of screens) {
    assert.ok(frameFor('overhead', s.width, s.height).zoom >= frameFor('threeQuarter', s.width, s.height).zoom * 0.95);
  }
});

test('perspective stays far enough away to avoid extreme distortion', () => {
  for (const s of screens) {
    for (const view of ['threeQuarter', 'overhead']) {
      assert.ok(rimMagnification(frameFor(view, s.width, s.height)) < 1.5, `${view} ${s.width}`);
    }
  }
});

test('tape corners run along the seam on top of the closed box', () => {
  const [tl, tr, br, bl] = tapeCorners();
  assert.equal(tr.x - tl.x, BOX.width);
  assert.equal(bl.y - tl.y, BOX.tapeWidth);
  assert.equal((tl.y + bl.y) / 2, BOX.depth / 2);
  assert.ok(tl.z > BOX.height && tl.z === br.z);
});

test('unknown views throw', () => {
  assert.throws(() => frameFor('sideways', 800, 600));
});
