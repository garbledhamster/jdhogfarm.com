import assert from 'node:assert/strict';
import { test } from 'node:test';

async function visit({ game, button }, place) {
  await button('Farm map').click();
  await game.locator(`.farm-map-pins [data-place="${place}"]`).click();
}

async function startHerd({ game, button }) {
  await button('Wooded plot').click();
  await button('Clear trees').click();
  await button('Build first pen').click();
  await button('Go to Farm Supply').click();
  await game.locator('[data-open="starters"][data-target="1"]').click();
  await game.getByRole('spinbutton', { name: 'Number of starter pigs' }).fill('2');
  await game.locator('[data-action="buy-starters"]').click();
}

async function orderGrain({ game, button }) {
  await button('Order grain').click();
  await game.locator('[data-action="order-grain"]').evaluate(confirm => {
    confirm.click();
    confirm.click();
  });
}

export function registerChoreBrowserTests(openGame) {
  test('bucket run collides, retries, and pauses across the map, rotation and a hidden page', async t => {
    const fixture = await openGame(t, {
      isMobile: true, hasTouch: true, viewport: { width: 390, height: 740 }, reducedMotion: 'reduce'
    });
    const { page, game, button, value } = fixture;
    await startHerd(fixture);
    await visit(fixture, 'barn');
    await orderGrain(fixture);
    await page.clock.runFor(1200);
    assert.equal(await value('grain'), '4');
    await button('Take bucket').tap();
    const start = button('Start walking');
    await start.waitFor();
    assert.equal(await start.evaluate(node => document.activeElement === node), true);
    const progress = () => game.locator('[data-chore-progress]').evaluate(node => node.value);
    const carrier = game.locator('[data-chore-hero]');
    for (const landmark of ['creek-bridge', 'pen-gate', 'piglet-pen']) {
      await game.locator(`[data-farm-landmark="${landmark}"]`).waitFor();
    }
    const entrance = await carrier.getAttribute('transform');
    await page.clock.runFor(10000);
    assert.equal(await progress(), 0);
    assert.equal(await carrier.getAttribute('transform'), entrance);
    await page.keyboard.press('Enter');
    assert.equal(await button('Middle lane').evaluate(node => document.activeElement === node), true);
    await page.clock.runFor(3000);
    await game.getByText('You met a rock. Retry or walk with Joe.').waitFor();
    assert.equal(await value('grain'), '4');

    assert.equal(await button('Retry route').evaluate(node => document.activeElement === node), true);
    await button('Retry route').tap();
    assert.equal(await button('Middle lane').evaluate(node => document.activeElement === node), true);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await button('Left lane').getAttribute('aria-pressed'), 'true');
    await button('Right lane').tap();
    await button('Left lane').tap();
    await page.clock.runFor(1100);
    const heldProgress = await progress();
    assert.ok(heldProgress > 0 && heldProgress < 50);
    await button('Farm map').tap();
    await page.setViewportSize({ width: 740, height: 350 });
    await page.clock.runFor(10000);
    await button('Return to Feed run').tap();
    assert.equal(await progress(), heldProgress);
    assert.equal(await button('Left lane').getAttribute('aria-pressed'), 'true');

    const setHidden = hidden => page.evaluate(value => {
      if (value) Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      else delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
    await setHidden(true);
    await page.clock.runFor(10000);
    assert.equal(await progress(), heldProgress);
    await setHidden(false);
    await page.clock.runFor(5200);
    await game.getByRole('heading', { name: 'Piglet pen', exact: true }).waitFor();
    assert.equal(await value('grain'), '4');
    await button('Pour feed').evaluate(pour => {
      pour.click();
      pour.click();
    });
    assert.equal(await value('grain'), '1');
    await game.locator('[data-trough-stocked="true"]').waitFor();
    await game.getByText('grew to 1 fed week.', { exact: false }).waitFor();
  });

  test('bucket run can recover a grain shortfall by refilling without losing feed in transit', async t => {
    const fixture = await openGame(t, { reducedMotion: 'reduce' });
    const { page, game, button, value } = fixture;
    await startHerd(fixture);
    await visit(fixture, 'barn');
    assert.match(await button('Order grain').getAttribute('class'), /farm-primary-action/u);
    assert.doesNotMatch(await button('Take bucket').getAttribute('class'), /farm-primary-action/u);
    await game.getByText('Order grain before taking the bucket.', { exact: false }).waitFor();
    await button('Take bucket').click();
    await button('Walk with Joe').click();
    await page.clock.runFor(2500);
    await button('Pour feed').click();
    await game.getByRole('heading', { name: 'Feed shortfall', exact: true }).waitFor();
    assert.equal(await value('grain'), '0');
    await button('Back to Barn').click();
    await orderGrain(fixture);
    await page.clock.runFor(1200);
    await button('Refill bucket').click();
    assert.equal(await value('grain'), '4');
    await button('Walk with Joe').click();
    await page.clock.runFor(2500);
    await button('Pour feed').click();
    assert.equal(await value('grain'), '1');
    await game.getByText('grew to 1 fed week.', { exact: false }).waitFor();
  });

  test('map labels stay beside their destinations and show the live grain truck in both orientations', async t => {
    const fixture = await openGame(t, {
      isMobile: true, hasTouch: true, viewport: { width: 320, height: 568 }, reducedMotion: 'reduce'
    });
    const { page, game, button } = fixture;
    await visit(fixture, 'barn');
    await orderGrain(fixture);
    await button('Farm map').tap();
    const map = game.getByRole('navigation', { name: 'Places on the farm' });
    const barn = button('Barn');
    assert.match(await barn.innerText(), /truck on the road/i);
    assert.equal(await map.locator('[data-map-truck="arriving"]').count(), 1);

    for (const [width, height] of [[320, 568], [667, 375]]) {
      await page.setViewportSize({ width, height });
      const layout = await map.evaluate(nav => {
        const field = nav.closest('.farm-playfield').getBoundingClientRect();
        return [...nav.querySelectorAll('.farm-map-pin[data-place]:not([data-place="route"])')].map(pin => {
          const label = pin.getBoundingClientRect();
          const art = pin.parentElement.querySelector('[data-map-place-art]')?.getBoundingClientRect();
          return {
            place: pin.dataset.place,
            targetFits: label.left >= field.left && label.right <= field.right &&
              label.top >= field.top && label.bottom <= field.bottom && label.height >= 44,
            artFits: Boolean(art && art.width > 0 && art.height > 0 &&
              art.left >= field.left && art.right <= field.right &&
              art.top >= field.top && art.bottom <= field.bottom),
            hasReadableText: pin.scrollWidth <= pin.clientWidth + 1
          };
        });
      });
      assert.equal(layout.length, 6);
      for (const place of layout) {
        assert.deepEqual(place, { place: place.place, targetFits: true, artFits: true, hasReadableText: true });
      }
      for (const landmark of ['creek-bridge', 'pen-gate', 'piglet-pen']) {
        await map.locator(`[data-farm-landmark="${landmark}"]`).waitFor();
      }
    }
    await barn.focus();
    await page.clock.runFor(500);
    assert.match(await barn.innerText(), /unloading grain/i);
    assert.equal(await barn.evaluate(node => node === document.activeElement), true);
    assert.equal(await map.locator('[data-map-truck="unloading"]').count(), 1);
    await page.clock.runFor(800);
    assert.match(await barn.innerText(), /grain ready/i);
    assert.equal(await map.locator('[data-map-truck]').count(), 0);
    await page.keyboard.press('Enter');
    await game.getByRole('heading', { name: 'Barn', exact: true }).waitFor();
    await button('Farm map').tap();
    await button('Piglet pen').tap();
    await game.getByRole('heading', { name: 'Piglet pen', exact: true }).waitFor();
  });

  test('grain delivery finishes once across map visits with reduced motion', async t => {
    const fixture = await openGame(t, { reducedMotion: 'reduce' });
    const { page, game, button, value } = fixture;
    await visit(fixture, 'barn');
    await button('Go to Pasture').waitFor();
    assert.equal(await button('Finish feeding').count(), 0);
    await orderGrain(fixture);
    assert.equal(await value('cash'), '$900');
    assert.equal(await value('grain'), '0');
    await game.locator('[data-delivery-stage="arriving"]').waitFor();
    await button('Farm map').click();
    await page.clock.runFor(500);
    await button('Return to Barn').click();
    const unloading = game.locator('[data-delivery-stage="unloading"]');
    await unloading.waitFor();
    assert.equal(await unloading.locator('.farm-grain-bed').evaluate(node => getComputedStyle(node).animationName), 'none');
    assert.equal(await game.locator('[data-open="grain-order"]').count(), 0);
    await button('Farm map').click();
    await page.clock.runFor(1000);
    await button('Return to Barn').click();
    await game.locator('[data-bin-stocked="true"]').waitFor();
    assert.equal(await value('grain'), '4');
  });

  test('grain delivery replay cancels the old callback when a new truck has the same shipment ID', async t => {
    const fixture = await openGame(t);
    const { page, game, button, value } = fixture;
    await visit(fixture, 'barn');
    await orderGrain(fixture);
    await page.clock.runFor(500);
    await game.locator('[data-delivery-stage="unloading"]').waitFor();
    await button('Help journal').click();
    await game.locator('[data-open="replay"]').click();
    await game.locator('[data-action="replay"]').click();
    assert.equal(await value('cash'), '$1,000');
    assert.equal(await value('grain'), '0');
    await visit(fixture, 'barn');
    await orderGrain(fixture);
    await page.clock.runFor(800);
    assert.equal(await value('grain'), '0');
    await page.clock.runFor(500);
    assert.equal(await value('grain'), '4');
    assert.equal(await value('cash'), '$900');
  });
}
