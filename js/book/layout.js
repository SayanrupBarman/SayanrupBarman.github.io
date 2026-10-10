/**
 * Decide how big the open book can be for a given viewport, and whether it
 * shows a two-page spread or a single page. Small screens get a single page
 * with readable text rather than a shrunken spread.
 */

export const MIN_FONT_PX = 16;
const MAX_FONT_PX = 19;
const PAGE_ASPECT = 0.72; // width / height of one page
const MIN_SPREAD_PAGE_WIDTH = 300;
const MAX_PAGE_WIDTH = 560;
const MAX_SINGLE_PAGE_WIDTH = 520;
const VERTICAL_CHROME = 112; // close button above, page indicator below
const SIDE_CONTROLS = 120; // previous / next buttons beside a spread
const EDGE_GUTTER = 24;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function fontFor(pageWidth) {
  return clamp(Math.round(pageWidth / 26), MIN_FONT_PX, MAX_FONT_PX);
}

export function computeBookLayout({ width, height }) {
  const availH = Math.max(200, height - VERTICAL_CHROME);
  const spreadAvailW = width - SIDE_CONTROLS;
  const spreadPageW = Math.floor(Math.min(spreadAvailW / 2, availH * PAGE_ASPECT, MAX_PAGE_WIDTH));

  if (spreadPageW >= MIN_SPREAD_PAGE_WIDTH) {
    return Object.freeze({
      mode: 'spread',
      pageWidth: spreadPageW,
      pageHeight: Math.floor(spreadPageW / PAGE_ASPECT),
      fontSize: fontFor(spreadPageW),
    });
  }

  const singleAvailW = Math.max(240, width - EDGE_GUTTER);
  let pageWidth = Math.min(singleAvailW, MAX_SINGLE_PAGE_WIDTH);
  let pageHeight = Math.min(availH, pageWidth / 0.68);
  // Short landscape phones: keep the page from becoming a wide ribbon.
  if (pageWidth > pageHeight * 1.4) pageWidth = pageHeight * 1.4;
  pageWidth = Math.floor(pageWidth);
  pageHeight = Math.floor(pageHeight);
  return Object.freeze({ mode: 'single', pageWidth, pageHeight, fontSize: fontFor(pageWidth) });
}
