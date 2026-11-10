import assert from 'node:assert/strict';
import { test } from 'node:test';

function bookPanel(farm) {
  return farm.game.getByRole('dialog', { name: 'Farm book', exact: true });
}

function section(book, name) {
  return book.getByRole('region', { name, exact: true });
}

export function registerFarmBookBrowserTests(farmDriver) {
  test('Farm book reconciles the Week 2 grain shortage', async t => {
    const farm = await farmDriver(t, 'touch', { viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' });
    await farm.build();
    await farm.go('supply');
    await farm.stock('1', 2);
    await farm.feed();
    await farm.click('Farm book');
    const book = bookPanel(farm);
    await farm.click('Feed');
    assert.match(await section(book, 'Feed').innerText(), /This morning · Fed.+5 to feed.+2 from forage.+3 grain used/is);
    await farm.click('Close');
    await farm.closeWeek();
    await farm.click('Farm book');
    await book.waitFor();
    assert.match(await farm.value('week'), /Week 2/);
    assert.equal(await farm.value('cash'), '$620');
    assert.equal(await farm.value('herd'), '5');
    assert.equal(await farm.value('grain'), '1');

    await farm.click('Pens');
    const pens = section(book, 'Pens');
    assert.match(await pens.innerText(), /Pen 1.+2\/4.+2 fed weeks.+2 feeder.ready/is);
    assert.match(await pens.innerText(), /Litter.+3 piglets.+1 fed week/is);
    assert.match(await pens.innerText(), /Breeding pair.+1 boar.+1 sow/is);
    await farm.click('Feed');
    const feed = section(book, 'Feed');
    assert.match(await feed.innerText(), /This morning.+5 to feed.+2 from forage.+short by 2/is);
    assert.match(await feed.innerText(), /Next morning.+5 to feed/is);
    assert.match(await feed.innerText(), /1 unit in the bin/i);
    await farm.click('Land');
    assert.match(await section(book, 'Land').innerText(), /Plot 1.+fenced.+Plot 2.+locked.+Paddock A.+active/is);
    await farm.click('Sales');
    assert.match(await section(book, 'Sales').innerText(), /Feeders sold.+0.+Market hogs sold.+0.+Receipts.+\$0.+Spending.+\$380/is);

    for (const [width, height] of [[320, 568], [667, 375]]) {
      await farm.page.setViewportSize({ width, height });
      await farm.click('Feed');
      const layout = await book.evaluate(panel => {
        const nav = panel.querySelector('.farm-book-sections');
        const body = panel.querySelector('.farm-panel-body');
        const buttons = [...nav.querySelectorAll('button'), panel.querySelector('[data-panel-close]')];
        const page = panel.querySelector('.farm-book-page');
        page.scrollTop = page.scrollHeight;
        return {
          fits: [panel, body, page].every(node => node.scrollWidth <= node.clientWidth + 1),
          pageScrolls: page.scrollTop > 0 && panel.scrollTop === 0 && body.scrollTop === 0,
          controlsVisible: buttons.every(button => {
            const rect = button.getBoundingClientRect();
            return rect.height >= 44 && rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth;
          })
        };
      });
      assert.deepEqual(layout, { fits: true, pageScrolls: true, controlsVisible: true }, `${width} × ${height}`);
    }

    await farm.click('Close');
    assert.match(await farm.game.getByRole('status').filter({ hasText: /Week 1 closed/ }).innerText(), /Debbie posted the \$80 bill/);
    assert.match(await farm.game.locator('.farm-scene').innerText(), /5 to feed.+2 from grass.+short by 2/is);
    await farm.go('orders');
    assert.equal(await farm.game.getByRole('button', { name: /Sell feeders.+Pen 1/ }).count(), 1);
    assert.equal(await farm.game.getByRole('button', { name: /Sell feeders.+litter/i }).count(), 0);
    await farm.go('office');
    await farm.pick('ledger');
    assert.match(await farm.game.locator('#farm-panel').innerText(), /\$620/);
    await farm.click('Close');

    await farm.sell('feeder', '1', 1);
    await farm.click('Farm book');
    await farm.click('Sales');
    assert.match(await section(book, 'Sales').innerText(), /Feeders sold.+1.+Market hogs sold.+0.+Receipts.+\$200.+Spending.+\$380/is);
    assert.equal(await farm.value('cash'), '$820');
  });

  test('Farm book pauses and restores the crossing', async t => {
    const farm = await farmDriver(t, 'keyboard');
    const { page, game, value } = farm;
    await farm.build();
    await farm.go('supply');
    await farm.stock('1', 2);
    await farm.feed();
    await farm.closeWeek();
    await farm.local('start-route');
    await farm.go('barn');
    await farm.pick('grain-order');
    await farm.action('order-grain');
    await farm.go('route');
    await farm.local('walk-route');
    await page.keyboard.press('ArrowLeft');
    await page.clock.runFor(240);
    const carrier = game.locator('[data-chore-hero]');
    const progress = game.locator('[data-chore-progress]');
    const readProgress = () => progress.evaluate(node => node.value);
    const progressBefore = await readProgress();
    const positionBefore = await carrier.getAttribute('transform');
    assert.ok(progressBefore > 0);

    const opener = game.getByRole('button', { name: 'Farm book', exact: true });
    await opener.press('Enter');
    const book = bookPanel(farm);
    const feedButton = book.getByRole('button', { name: 'Feed', exact: true });
    for (let step = 0; step < 3; step += 1) await page.keyboard.press('Tab');
    assert.equal(await feedButton.evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Enter');
    const feed = section(book, 'Feed');
    assert.match(await feed.innerText(), /1 unit in the bin.+1 unit reserved in the bucket.+4 units incoming/is);
    await page.keyboard.press('ArrowRight');
    await page.clock.runFor(250);
    assert.equal(await value('grain'), '1');
    assert.match(await feed.innerText(), /4 units incoming · Unloading/i);
    await page.clock.runFor(8000);
    assert.equal(await value('grain'), '5');
    assert.match(await feed.innerText(), /5 units in the bin.+1 unit reserved in the bucket.+No shipment incoming/is);
    assert.equal(await feedButton.getAttribute('aria-pressed'), 'true');
    assert.equal(await feedButton.evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Escape');
    await book.waitFor({ state: 'hidden' });
    assert.equal(await opener.evaluate(node => node === document.activeElement), true);
    assert.equal(await readProgress(), progressBefore);
    assert.equal(await carrier.getAttribute('transform'), positionBefore);
    assert.equal(await game.getByRole('button', { name: 'Left lane', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('ArrowRight');
    assert.equal(await game.getByRole('button', { name: 'Middle lane', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.clock.runFor(240);
    assert.ok(await readProgress() > progressBefore);
  });
}
