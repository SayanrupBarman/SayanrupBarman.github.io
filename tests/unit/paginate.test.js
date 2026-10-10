import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginate, splitHtmlWords } from '../../js/book/paginate.js';

const text = (html) => html.replace(/<[^>]+>/g, '');
const cost = (b) => {
  if (b.type === 'image') return b.cost ?? 40;
  if (b.type === 'list') return b.items.reduce((n, i) => n + text(i).length + 4, 0);
  return text(b.html).length + 10;
};
const fitsWithin = (capacity) => (blocks) => blocks.reduce((n, b) => n + cost(b), 0) <= capacity;
const words = (n, prefix = 'w') => Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(' ');

test('short sections become one page each', () => {
  const sections = [[{ type: 'heading', level: 1, html: 'Hi' }], [{ type: 'paragraph', html: 'short' }]];
  const pages = paginate(sections, { fits: fitsWithin(200) });
  assert.equal(pages.length, 2);
});

test('long paragraphs flow across pages without losing words', () => {
  const para = { type: 'paragraph', html: words(120) };
  const pages = paginate([[para]], { fits: fitsWithin(150) });
  assert.ok(pages.length > 1);
  const joined = pages.flat().map((b) => b.html).join(' ');
  assert.equal(joined, para.html);
  assert.ok(pages.flat().slice(1).every((b) => b.continued === true));
});

test('splitting keeps inline tags balanced', () => {
  const [head, tail] = splitHtmlWords('one <strong>two three four</strong> five', 3);
  assert.equal(head, 'one <strong>two three</strong>');
  assert.equal(tail, '<strong>four</strong> five');
});

test('headings stay with the paragraph that follows', () => {
  const sections = [[
    { type: 'paragraph', html: words(12) },
    { type: 'heading', level: 2, html: 'Next part' },
    { type: 'image', src: 'x', alt: '', cost: 60 },
  ]];
  const pages = paginate(sections, { fits: fitsWithin(120) });
  const headingPage = pages.findIndex((p) => p.some((b) => b.type === 'heading'));
  const imagePage = pages.findIndex((p) => p.some((b) => b.type === 'image'));
  assert.equal(headingPage, imagePage);
});

test('an oversized image gets a page of its own', () => {
  const sections = [[{ type: 'paragraph', html: 'intro' }, { type: 'image', src: 'x', alt: '', cost: 999 }]];
  const pages = paginate(sections, { fits: fitsWithin(100) });
  assert.equal(pages.length, 2);
  assert.equal(pages[1][0].type, 'image');
});

test('long lists split between items', () => {
  const list = { type: 'list', items: Array.from({ length: 12 }, (_, i) => `item number ${i}`) };
  const pages = paginate([[list]], { fits: fitsWithin(80) });
  assert.ok(pages.length > 1);
  assert.equal(pages.flat().flatMap((b) => b.items).length, 12);
});

test('no sections means no pages', () => {
  assert.deepEqual(paginate([], { fits: fitsWithin(10) }), []);
});
