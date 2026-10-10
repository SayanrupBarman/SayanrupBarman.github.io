import { test, expect } from '@playwright/test';
import {
  openSite, stateOf, progressOf, soundOf, waitForState, tapeLine, dragAlong, mouseCutAll, touchDrag,
} from './helpers.js';

test.describe('cutting with a mouse', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop pointer behaviour');

  test('the knife cursor appears over the parcel only', async ({ page }) => {
    await openSite(page);
    const parcelCursor = await page.$eval('.parcel', (el) => getComputedStyle(el).cursor);
    const stageCursor = await page.$eval('#stage', (el) => getComputedStyle(el).cursor);
    expect(parcelCursor).toContain('knife.svg');
    expect(parcelCursor).toMatch(/3 29/); // hotspot on the blade tip
    expect(stageCursor).not.toContain('knife');
  });

  test('moving without holding the button cuts nothing', async ({ page }) => {
    await openSite(page);
    const along = await tapeLine(page);
    for (let i = 0; i <= 30; i += 1) {
      const p = along(i / 30);
      await page.mouse.move(p.x, p.y);
    }
    expect(await progressOf(page)).toBe(0);
    expect(await stateOf(page)).toBe('sealed');
  });

  test('retracing adds nothing and releasing keeps progress', async ({ page }) => {
    await openSite(page);
    const along = await tapeLine(page);
    const start = along(0.05);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await dragAlong(page, along, 0.05, 0.45);
    expect(await stateOf(page)).toBe('cutting');
    const first = await progressOf(page);
    expect(first).toBeGreaterThan(0.3);
    expect(first).toBeLessThan(0.5);
    // Scrub back and forth inside the part that is already cut.
    for (let i = 0; i < 3; i += 1) {
      await dragAlong(page, along, 0.4, 0.1);
      await dragAlong(page, along, 0.1, 0.4);
    }
    expect(await progressOf(page)).toBe(first);
    await page.mouse.up();
    const end = along(0.9);
    await page.mouse.move(end.x, end.y);
    expect(await progressOf(page)).toBe(first);
    await expect(page.locator('#instruction')).toHaveText('keep going…');
  });

  test('the cutting sound plays only while the knife moves on the tape', async ({ page }) => {
    await openSite(page);
    const along = await tapeLine(page);
    const start = along(0.1);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await dragAlong(page, along, 0.1, 0.3, 20);
    let sound = await soundOf(page);
    expect(sound.context).toBe('running');
    expect(sound.loops).toContain('cut');

    await page.waitForTimeout(350); // holding still
    expect((await soundOf(page)).loops).not.toContain('cut');

    await dragAlong(page, along, 0.3, 0.4, 10);
    expect((await soundOf(page)).loops).toContain('cut');

    const before = await progressOf(page);
    const off = along(0.6, 220); // wander off the tape while pressed
    await page.mouse.move(off.x, off.y, { steps: 8 });
    await page.mouse.move(off.x + 60, off.y, { steps: 8 });
    sound = await soundOf(page);
    expect(sound.loops).not.toContain('cut');
    expect(await progressOf(page)).toBe(before);

    await page.mouse.up();
    expect((await soundOf(page)).loops).not.toContain('cut');
  });

  test('cutting most of the tape opens the box into darkness', async ({ page }) => {
    await openSite(page);
    await mouseCutAll(page);
    await waitForState(page, 'dark');
    await expect(page.locator('.parcel')).toHaveClass(/is-open/);
    await expect(page.locator('.question')).toBeVisible();
    expect((await soundOf(page)).loops).toEqual([]);
  });
});

test.describe('cutting with a finger', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch behaviour');

  test('pressing and dragging along the tape opens the box', async ({ page }) => {
    await openSite(page);
    await expect(page.locator('#instruction')).toHaveText('Press and drag along the tape to cut it.');
    const along = await tapeLine(page);
    const half = Array.from({ length: 30 }, (_, i) => along(0.02 + i * 0.016));
    await touchDrag(page, half);
    const midway = await progressOf(page);
    expect(midway).toBeGreaterThan(0.3);
    expect(await stateOf(page)).toBe('cutting');
    await touchDrag(page, Array.from({ length: 40 }, (_, i) => along(0.45 + i * 0.0137)));
    await waitForState(page, 'dark');
  });

  test('no custom cursors on touch screens', async ({ page }) => {
    await openSite(page);
    const cursor = await page.$eval('.parcel', (el) => getComputedStyle(el).cursor);
    expect(cursor).not.toContain('knife');
  });
});
