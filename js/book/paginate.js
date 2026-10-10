/**
 * Flow parsed book blocks onto pages of a fixed size.
 *
 * Measuring is injected (`fits(blocks) → boolean`), so the algorithm is pure
 * and testable; in the browser `fits` renders into a hidden page and checks
 * for overflow. Paragraphs and notes split between words, lists between items,
 * headings never sit alone at the bottom of a page.
 */

const TOKEN = /(<\/?[a-zA-Z][^>]*>)|(\s+)|([^<\s]+)/g;

function tokenize(html) {
  return [...html.matchAll(TOKEN)].map((m) => {
    if (m[1]) {
      const closing = m[1].startsWith('</');
      const name = /^<\/?([a-zA-Z0-9]+)/.exec(m[1])[1].toLowerCase();
      return { kind: closing ? 'close' : 'open', text: m[1], name };
    }
    return { kind: m[2] ? 'space' : 'word', text: m[0] };
  });
}

export function countWords(html) {
  return tokenize(html).filter((t) => t.kind === 'word').length;
}

/** Split HTML after `count` words, closing and re-opening inline tags. */
export function splitHtmlWords(html, count) {
  const tokens = tokenize(html);
  const stack = [];
  let words = 0;
  let i = 0;
  for (; i < tokens.length && words < count; i += 1) {
    const t = tokens[i];
    if (t.kind === 'word') words += 1;
    else if (t.kind === 'open') stack.push(t);
    else if (t.kind === 'close') stack.pop();
  }
  // Let closing tags that directly follow the last word stay in the head.
  while (i < tokens.length && tokens[i].kind === 'close') {
    stack.pop();
    i += 1;
  }
  const closers = [...stack].reverse().map((t) => `</${t.name}>`).join('');
  const reopeners = stack.map((t) => t.text).join('');
  const head = tokens.slice(0, i).map((t) => t.text).join('').trimEnd() + closers;
  const tail = reopeners + tokens.slice(i).map((t) => t.text).join('').trimStart();
  return [head, tail];
}

const isTextBlock = (b) => b.type === 'paragraph' || b.type === 'note';

/** Largest n in [1, max] where test(n) holds, assuming monotonic; 0 if none. */
function largestFitting(max, test) {
  let lo = 0;
  let hi = max;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (test(mid)) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Try to put the first part of `block` on the current page. */
function splitToFit(current, block, fits) {
  if (isTextBlock(block)) {
    const total = countWords(block.html);
    const headFor = (n) => ({ ...block, html: splitHtmlWords(block.html, n)[0] });
    const n = largestFitting(total - 1, (k) => fits([...current, headFor(k)]));
    if (n === 0) return null;
    const [head, tail] = splitHtmlWords(block.html, n);
    return [{ ...block, html: head }, { ...block, html: tail, continued: true }];
  }
  if (block.type === 'list') {
    const n = largestFitting(block.items.length - 1, (k) => fits([...current, { ...block, items: block.items.slice(0, k) }]));
    if (n === 0) return null;
    return [{ ...block, items: block.items.slice(0, n) }, { ...block, items: block.items.slice(n), continued: true }];
  }
  return null;
}

function paginateSection(blocks, fits) {
  const pages = [];
  let current = [];
  const queue = [...blocks];

  while (queue.length) {
    const block = queue.shift();
    const candidate = [...current, block];
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    const split = splitToFit(current, block, fits);
    if (split) {
      pages.push([...current, split[0]]);
      current = [];
      queue.unshift(split[1]);
    } else if (current.length === 0) {
      pages.push([block]); // too big even alone: give it its own page
    } else if (current.at(-1).type === 'heading' && current.length > 1) {
      pages.push(current.slice(0, -1));
      current = [current.at(-1)];
      queue.unshift(block);
    } else {
      pages.push(current);
      current = [];
      queue.unshift(block);
    }
  }
  if (current.length) pages.push(current);
  return pages;
}

/**
 * @param {object[][]} sections blocks per section (each section starts a page)
 * @param {{fits:(blocks:object[])=>boolean}} measure
 * @returns {object[][]} pages of blocks
 */
export function paginate(sections, { fits }) {
  return sections.flatMap((blocks) => paginateSection(blocks, fits));
}
