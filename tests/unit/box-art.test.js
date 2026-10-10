import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import config from '../../content/site.js';

const ROOT = new URL('../../', import.meta.url);

/** The box layers and the proportions the 3D parcel is built around (README → Artwork). */
const BOX_LAYERS = {
  boxFront: [420, 220],
  boxSide: [300, 220],
  flapLong: [420, 150],
  flapShort: [300, 150],
  boxInside: [420, 220],
  boxFloor: [420, 300],
};

const viewBoxSize = (svg) => {
  const match = svg.match(/viewBox="([^"]+)"/);
  assert.ok(match, 'the SVG has a viewBox');
  const [, , width, height] = match[1].trim().split(/[\s,]+/).map(Number);
  return { width, height };
};

for (const [key, [width, height]] of Object.entries(BOX_LAYERS)) {
  test(`${key} is finished box art, not a placeholder`, async () => {
    const path = config.art[key];
    assert.ok(!path.includes('/placeholders/'), `${key} still points at ${path}`);
    const bytes = await readFile(new URL(path, ROOT)); // throws if the file is missing
    if (!path.endsWith('.svg')) return;
    const svg = bytes.toString('utf8');
    assert.doesNotMatch(svg, /placeholder/i, `${path} still carries a "placeholder" label`);
    const size = viewBoxSize(svg);
    assert.ok(
      Math.abs(size.width / size.height - width / height) < 0.01,
      `${path} is ${size.width} × ${size.height}; the box needs ${width} × ${height} proportions`,
    );
  });
}
