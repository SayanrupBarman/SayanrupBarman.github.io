/**
 * The story beats: open the box, reveal the inside, open and close the book,
 * restart. Each busy beat runs through machine.perform(), which refuses to
 * start while another beat is still running.
 */

import { prefersReducedMotion as reduced, motionMs } from './core/env.js';
import { wait } from './core/tween.js';
import { screenPoint } from './scene/parcel.js';
import { computeBookLayout } from './book/layout.js';

const FLAP_SOUNDS = [0, 0.13, 0.4, 0.52];

export function createFlow(app) {
  const { machine, scene, camera, sound, bookView, flyer, dom, announce, text } = app;

  /** Fade the scene out and in around an instant change (reduced motion). */
  async function crossfade(change) {
    const out = dom.stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    await out.finished;
    change();
    await dom.stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 }).finished;
    out.cancel();
  }

  const focusIfKeyboard = (el) => {
    if (app.isKeyboardUser()) el.focus({ preventScroll: true });
  };

  async function openBox() {
    const ran = await machine.perform('CUT_DONE', async () => {
      scene.parcel.classList.add('is-cut');
      await wait(motionMs(380));
      scene.parcel.classList.add('is-open');
      if (reduced()) {
        sound.play('flap');
        await crossfade(() => {});
      } else {
        FLAP_SOUNDS.forEach((delay, i) => sound.play('flap', { delay, rate: 0.9 + i * 0.06, volume: 0.8 }));
        await wait(1750);
      }
    }, 'OPENED');
    if (!ran) return;
    scene.question.tabIndex = 0;
    announce('The tape is cut and the box is open. It is dark inside, except for a question mark.');
    focusIfKeyboard(scene.question);
  }

  async function reveal() {
    const ran = await machine.perform('REVEAL', async () => {
      sound.unlock();
      sound.play('tap');
      sound.play('reveal', { volume: 0.6, delay: 0.25 });
      scene.question.tabIndex = -1;
      if (reduced()) await crossfade(() => camera.set('overhead'));
      else await camera.move('overhead', { duration: 2300 });
    }, 'REVEALED');
    if (!ran) return;
    scene.book.button.tabIndex = 0;
    announce('Looking down into the box: a photo and a little book.');
    focusIfKeyboard(scene.book.button);
  }

  const bookQuad = () => scene.book.corners.map(screenPoint);
  const layoutNow = () => computeBookLayout({ width: innerWidth, height: innerHeight });

  async function openBook() {
    const ran = await machine.perform('OPEN_BOOK', async () => {
      sound.unlock();
      sound.play('whoosh', { volume: 0.8 });
      const layout = layoutNow();
      const quad = bookQuad();
      bookView.prepare(layout);
      flyer.setPages(bookView.openingPages());
      scene.book.el.classList.add('is-away');
      document.body.classList.add('reader-open');
      dom.experience.inert = true;
      await flyer.lift(quad, layout, { reduced: reduced() });
      sound.play('page', { volume: 0.6, rate: 0.8 });
      await flyer.openCover({ reduced: reduced() });
      dom.reader.hidden = false;
      try {
        await bookView.show();
      } catch (err) {
        bookView.showError(text.bookError ?? 'This book could not be opened right now.');
        throw err;
      } finally {
        flyer.hide();
      }
    }, 'BOOK_OPENED');
    if (!ran) return;
    dom.reader.focus({ preventScroll: true });
    announce(`${text.bookTitle}: the book is open. Use the arrow keys or the page buttons to turn pages.`);
  }

  async function closeBook() {
    const ran = await machine.perform('CLOSE_BOOK', async () => {
      flyer.showOpen(bookView.layout, bookView.snapshot());
      dom.reader.hidden = true;
      bookView.destroy();
      sound.play('page', { volume: 0.5, rate: 0.85 });
      await flyer.closeCover({ reduced: reduced() });
      document.body.classList.remove('reader-open');
      sound.play('whoosh', { volume: 0.5, rate: 1.15 });
      await flyer.land(bookQuad(), { reduced: reduced() });
      scene.book.el.classList.remove('is-away');
      flyer.hide();
      dom.experience.inert = false;
    }, 'BOOK_CLOSED');
    if (!ran) return;
    scene.book.button.focus({ preventScroll: true });
    announce('The book is back in the box.');
  }

  function resetScene() {
    const { parcel } = scene;
    parcel.classList.add('no-anim');
    parcel.classList.remove('is-cut', 'is-open');
    scene.book.el.classList.remove('is-away');
    scene.question.tabIndex = -1;
    scene.book.button.tabIndex = -1;
    camera.set('threeQuarter');
    app.cutting.reset();
    app.resetInstruction();
    void parcel.offsetWidth; // apply the closed flaps before re-enabling transitions
    requestAnimationFrame(() => parcel.classList.remove('no-anim'));
  }

  function restart() {
    if (!machine.can('RESTART')) return;
    if (bookView.isOpen()) bookView.destroy();
    dom.reader.hidden = true;
    dom.reader.classList.remove('has-turned');
    flyer.hide();
    document.body.classList.remove('reader-open');
    dom.experience.inert = false;
    resetScene();
    machine.send('RESTART');
    announce('A fresh, sealed parcel.');
    focusIfKeyboard(dom.slider);
  }

  /** Development preview: ?jump=dark | overhead | book */
  async function fastForward(target) {
    if (!['dark', 'overhead', 'book'].includes(target)) return;
    scene.parcel.classList.add('no-anim', 'is-cut', 'is-open');
    app.cutting.markDone();
    ['CUT_START', 'CUT_DONE', 'OPENED'].forEach((e) => machine.send(e));
    scene.question.tabIndex = 0;
    if (target !== 'dark') {
      machine.send('REVEAL');
      camera.set('overhead');
      machine.send('REVEALED');
      scene.question.tabIndex = -1;
      scene.book.button.tabIndex = 0;
    }
    void scene.parcel.offsetWidth;
    await new Promise(requestAnimationFrame);
    scene.parcel.classList.remove('no-anim');
    if (target === 'book') await openBook();
  }

  return { openBox, reveal, openBook, closeBook, restart, fastForward, layoutNow };
}
