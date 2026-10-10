import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMachine, nextState, STATES, isBusyState } from '../../js/core/state-machine.js';

test('starts in loading and moves to sealed when loaded', () => {
  const m = createMachine();
  assert.equal(m.state, STATES.LOADING);
  assert.equal(m.send('LOADED'), true);
  assert.equal(m.state, STATES.SEALED);
});

test('follows the full happy path', () => {
  const m = createMachine();
  const path = [
    ['LOADED', 'sealed'], ['CUT_START', 'cutting'], ['CUT_DONE', 'opening'], ['OPENED', 'dark'],
    ['REVEAL', 'revealing'], ['REVEALED', 'overhead'], ['OPEN_BOOK', 'lifting'],
    ['BOOK_OPENED', 'reading'], ['CLOSE_BOOK', 'closing'], ['BOOK_CLOSED', 'overhead'],
  ];
  for (const [event, expected] of path) {
    assert.equal(m.send(event), true, `event ${event}`);
    assert.equal(m.state, expected);
  }
});

test('ignores events that are not valid for the current state', () => {
  const m = createMachine();
  m.send('LOADED');
  assert.equal(m.send('OPEN_BOOK'), false);
  assert.equal(m.state, STATES.SEALED);
  assert.equal(nextState('sealed', 'REVEAL'), null);
});

test('busy states reject user events and restart', () => {
  const m = createMachine();
  m.send('LOADED');
  m.send('CUT_START');
  m.send('CUT_DONE');
  assert.equal(m.state, STATES.OPENING);
  assert.equal(m.isBusy(), true);
  assert.equal(m.send('REVEAL'), false);
  assert.equal(m.send('RESTART'), false);
  assert.equal(isBusyState('revealing'), true);
  assert.equal(isBusyState('overhead'), false);
});

test('restart is allowed from every stable stage', () => {
  for (const stable of ['sealed', 'cutting', 'dark', 'overhead', 'reading']) {
    assert.equal(nextState(stable, 'RESTART'), 'sealed', stable);
  }
  assert.equal(nextState('loading', 'RESTART'), null);
});

test('subscribers hear transitions and can unsubscribe', () => {
  const m = createMachine();
  const heard = [];
  const off = m.subscribe((to, from, event) => heard.push([to, from, event]));
  m.send('LOADED');
  off();
  m.send('CUT_START');
  assert.deepEqual(heard, [['sealed', 'loading', 'LOADED']]);
});

test('perform runs the task between start and end events', async () => {
  const m = createMachine();
  m.send('LOADED');
  m.send('CUT_START');
  const seen = [];
  const ran = await m.perform('CUT_DONE', async () => { seen.push(m.state); }, 'OPENED');
  assert.equal(ran, true);
  assert.deepEqual(seen, ['opening']);
  assert.equal(m.state, STATES.DARK);
});

test('perform refuses a second concurrent activation', async () => {
  const m = createMachine();
  ['LOADED', 'CUT_START', 'CUT_DONE', 'OPENED'].forEach((e) => m.send(e));
  let runs = 0;
  let release;
  const gate = new Promise((r) => { release = r; });
  const first = m.perform('REVEAL', async () => { runs += 1; await gate; }, 'REVEALED');
  const second = await m.perform('REVEAL', async () => { runs += 1; }, 'REVEALED');
  assert.equal(second, false);
  release();
  assert.equal(await first, true);
  assert.equal(runs, 1);
  assert.equal(m.state, STATES.OVERHEAD);
});

test('perform still reaches the end state when the task throws', async () => {
  const m = createMachine();
  ['LOADED', 'CUT_START', 'CUT_DONE', 'OPENED', 'REVEAL', 'REVEALED'].forEach((e) => m.send(e));
  const errors = [];
  const ran = await m.perform('OPEN_BOOK', async () => { throw new Error('boom'); }, 'BOOK_OPENED', {
    onError: (err) => errors.push(err.message),
  });
  assert.equal(ran, true);
  assert.deepEqual(errors, ['boom']);
  assert.equal(m.state, STATES.READING);
});
