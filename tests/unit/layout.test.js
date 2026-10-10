import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBookLayout, MIN_FONT_PX } from '../../js/book/layout.js';

const viewports = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 720 },
  tabletLandscape: { width: 1024, height: 768 },
  tabletPortrait: { width: 768, height: 1024 },
  phone: { width: 390, height: 844 },
  phoneLandscape: { width: 844, height: 390 },
  tiny: { width: 320, height: 480 },
};

test('desktops and landscape tablets get a two-page spread', () => {
  for (const name of ['desktop', 'laptop', 'tabletLandscape']) {
    const l = computeBookLayout(viewports[name]);
    assert.equal(l.mode, 'spread', name);
    assert.ok(l.pageWidth * 2 <= viewports[name].width, `${name} fits horizontally`);
    assert.ok(l.pageHeight <= viewports[name].height, `${name} fits vertically`);
  }
});

test('phones get a single page instead of a shrunken spread', () => {
  const l = computeBookLayout(viewports.phone);
  assert.equal(l.mode, 'single');
  assert.ok(l.pageWidth <= 390 && l.pageWidth >= 300);
});

test('text never drops below the minimum readable size', () => {
  for (const [name, vp] of Object.entries(viewports)) {
    const l = computeBookLayout(vp);
    assert.ok(l.fontSize >= MIN_FONT_PX, `${name}: ${l.fontSize}`);
    assert.ok(Number.isInteger(l.pageWidth) && Number.isInteger(l.pageHeight), name);
    assert.ok(l.pageWidth > 0 && l.pageHeight > 0, name);
  }
});

test('a short landscape phone still fits the page on screen', () => {
  const l = computeBookLayout(viewports.phoneLandscape);
  assert.ok(l.pageHeight <= 390);
  assert.ok(l.pageWidth <= 844);
});
