/**
 * Draws the transparent packing tape and the slit the visitor traces.
 *
 * The tape is split into two halves that ride on the two long flaps, so it
 * can come apart when the box opens. Both halves draw the *whole* tape in
 * shared tape coordinates and let their own SVG viewport clip the rest; the
 * slit therefore lines up perfectly across the seam.
 */

const NS = 'http://www.w3.org/2000/svg';

/** A slightly uneven edge so the tape looks torn from a roll, not ruled. */
function edgePath(length, y, amplitude, phase) {
  let d = `M0 ${y.toFixed(2)}`;
  for (let x = 6; x <= length; x += 6) {
    const wobble = (Math.sin(x * 0.37 + phase) + Math.sin(x * 0.113 + phase * 2)) * amplitude;
    d += ` L${x} ${(y + wobble).toFixed(2)}`;
  }
  return d;
}

function wrinkles(length, width) {
  const out = [];
  for (let x = 30; x < length - 20; x += 47 + ((x * 7) % 23)) {
    const lean = ((x * 13) % 9) - 4;
    out.push(`M${x} ${width * 0.18} L${x + lean} ${width * 0.82}`);
  }
  return out.join(' ');
}

function tapeMarkup(id, transform, length, width) {
  const pad = 12;
  return `
  <defs>
    <linearGradient id="tape-shine-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${width}">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/>
      <stop offset=".13" stop-color="#fff" stop-opacity=".14"/>
      <stop offset=".42" stop-color="#fff8e6" stop-opacity=".04"/>
      <stop offset=".6" stop-color="#fff" stop-opacity=".26"/>
      <stop offset=".7" stop-color="#fff" stop-opacity=".05"/>
      <stop offset="1" stop-color="#fff" stop-opacity=".42"/>
    </linearGradient>
    <linearGradient id="tape-glint-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${length}" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".3" stop-color="#fff" stop-opacity=".2"/>
      <stop offset=".38" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".72" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".8" stop-color="#fff" stop-opacity=".16"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="tape-cut-${id}" maskUnits="userSpaceOnUse" x="${-pad}" y="${-pad}" width="${length + 2 * pad}" height="${width + 2 * pad}">
      <rect x="${-pad}" y="${-pad}" width="${length + 2 * pad}" height="${width + 2 * pad}" fill="#fff"/>
      <path data-slit fill="none" stroke="#000" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    </mask>
  </defs>
  <g transform="${transform}">
    <g mask="url(#tape-cut-${id})">
      <rect width="${length}" height="${width}" fill="#f3e6c8" fill-opacity=".3"/>
      <rect width="${length}" height="${width}" fill="url(#tape-shine-${id})"/>
      <rect width="${length}" height="${width}" fill="url(#tape-glint-${id})"/>
      <path d="${wrinkles(length, width)}" stroke="#fff" stroke-opacity=".28" stroke-width="1.4" fill="none"/>
      <path class="cut-guide" d="M10 ${width / 2} L${length - 10} ${width / 2}" stroke="#4a3426" stroke-opacity=".3" stroke-width="1.2" stroke-dasharray="7 7" stroke-linecap="round" fill="none"/>
      <path d="${edgePath(length, 1.6, 0.35, 0)}" stroke="#5c3d22" stroke-opacity=".28" stroke-width="1" fill="none"/>
      <path d="${edgePath(length, 0.7, 0.35, 0)}" stroke="#fff" stroke-opacity=".85" stroke-width="1.3" fill="none"/>
      <path d="${edgePath(length, width - 1.6, 0.35, 2)}" stroke="#5c3d22" stroke-opacity=".28" stroke-width="1" fill="none"/>
      <path d="${edgePath(length, width - 0.7, 0.35, 2)}" stroke="#fff" stroke-opacity=".8" stroke-width="1.3" fill="none"/>
    </g>
    <path data-slit fill="none" stroke="#2f1d10" stroke-opacity=".55" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path data-slit fill="none" stroke="#fff" stroke-opacity=".95" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -2.1)"/>
    <path data-slit fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 2.1)"/>
  </g>`;
}

const pathFrom = (strokes) => strokes
  .filter((s) => s.length > 1)
  .map((s) => `M${s.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}`)
  .join(' ');

export function createTapeView({ svgs, length, width }) {
  const half = width / 2;
  const halves = [
    { svg: svgs.front, id: 'front', transform: `translate(0 ${-half})` },
    // The back flap is the front flap turned 180° about the box's centre.
    { svg: svgs.back, id: 'back', transform: `rotate(180 ${length / 2} ${half / 2})` },
  ];
  const slits = halves.flatMap(({ svg, id, transform }) => {
    svg.setAttribute('xmlns', NS);
    svg.setAttribute('viewBox', `0 0 ${length} ${half}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = tapeMarkup(id, transform, length, width);
    return [...svg.querySelectorAll('[data-slit]')];
  });

  const render = (strokes) => {
    const d = pathFrom(strokes);
    slits.forEach((p) => p.setAttribute('d', d));
  };

  return { render, reset: () => render([]) };
}
