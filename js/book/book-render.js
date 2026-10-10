/**
 * Turn parsed blocks into page elements.
 * Block HTML comes from markdown.js, which escapes all text and allows only
 * a handful of inline tags and safe links — so innerHTML here is safe.
 */

function el(tag, className = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export function renderBlock(block) {
  switch (block.type) {
    case 'heading': {
      const node = el(`h${block.level}`, 'hand');
      node.innerHTML = block.html;
      return node;
    }
    case 'note': {
      const node = el('p', `note hand${block.continued ? ' continued' : ''}`);
      node.innerHTML = block.html;
      return node;
    }
    case 'list': {
      const node = el('ul', block.continued ? 'continued' : '');
      block.items.forEach((html) => {
        const li = el('li');
        li.innerHTML = html;
        node.append(li);
      });
      return node;
    }
    case 'image': {
      const figure = el('figure');
      const img = el('img');
      img.src = block.src;
      img.alt = block.alt;
      img.decoding = 'async';
      figure.append(img);
      if (block.caption) {
        const caption = el('figcaption', 'hand');
        caption.textContent = block.caption;
        figure.append(caption);
      }
      return figure;
    }
    default: {
      const node = el('p', block.continued ? 'continued' : '');
      node.innerHTML = block.html;
      return node;
    }
  }
}

/** One paper page; `folio` is the printed page number (omit for endpapers). */
export function buildPage(blocks, { folio = null, kind = 'text' } = {}) {
  const page = el('div', `page page-${kind}`);
  page.dataset.density = 'soft';
  const paper = el('div', 'page-paper');
  const inner = el('div', 'page-inner');
  inner.append(...blocks.map(renderBlock));
  paper.append(inner);
  if (folio !== null) {
    const number = el('span', 'page-folio hand');
    number.textContent = String(folio);
    paper.append(number);
  }
  page.append(paper);
  return page;
}

/** The inside of the cover: decorative paper with an ex-libris label. */
export function buildEndpaper({ ownerLine, ownerName }, { back = false } = {}) {
  const page = el('div', `page page-endpaper${back ? ' page-endpaper-back' : ''}`);
  page.dataset.density = 'soft';
  if (!back) {
    const label = el('div', 'ex-libris');
    const line = el('span', 'ex-libris-line hand');
    line.textContent = ownerLine;
    const name = el('span', 'ex-libris-name hand');
    name.textContent = ownerName;
    label.append(line, name);
    page.append(label);
  }
  return page;
}

/**
 * Build a `fits(blocks)` measure using a hidden page of the current size.
 * Returns { fits, dispose }.
 */
export function createMeasurer(host) {
  const page = buildPage([], { folio: 0 });
  page.classList.add('page-measure');
  page.setAttribute('aria-hidden', 'true');
  host.append(page);
  const inner = page.querySelector('.page-inner');
  return {
    fits(blocks) {
      inner.replaceChildren(...blocks.map(renderBlock));
      return inner.scrollHeight <= inner.clientHeight + 0.5;
    },
    dispose: () => page.remove(),
  };
}
