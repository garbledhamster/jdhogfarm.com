import assert from 'node:assert/strict';
import { test } from 'node:test';

export function registerFarmReceiptBrowserTests(farmDriver) {
  test('farm receipt follows the latest committed action into the Farm book after reload', async t => {
    const farm = await farmDriver(t, 'touch', { viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' });
    const { page, game, value } = farm;
    const notice = game.locator('#farm-notice');
    const book = game.getByRole('dialog', { name: 'Farm book', exact: true });
    await page.route('https://fonts.googleapis.com/**', route => route.abort());

    async function reload() {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Continue season', exact: true }).click({ timeout: 2500 });
    }

    await farm.build();
    await farm.go('supply');
    await farm.stock('1', 2);
    assert.match(await notice.innerText(), /Starter pigs.*-\$200.*\$800/i);
    await farm.feed();
    await farm.closeWeek();
    const visibleBill = await notice.evaluate(node => {
      const receipt = node.getBoundingClientRect();
      const region = node.closest('.farm-information').getBoundingClientRect();
      return receipt.top >= region.top && receipt.bottom <= region.bottom + 1;
    });
    assert.equal(visibleBill, true, 'The weekly bill should be readable without scrolling the new morning');
    await farm.sell('feeder', '1', 1);
    assert.match(await notice.innerText(), /Feeder pickup.*\+\$200.*\$820/i);

    await reload();
    await farm.click('Farm book');
    await farm.click('Sales');
    assert.match(await book.innerText(), /Latest change.+Feeder pickup.+\+\$200.+\$820/is);
    assert.match(await book.innerText(), /Receipts.+\$200.+Spending.+\$380.+Net cash movement.+-\$180/is);
    await farm.click('Close');

    await farm.go('barn');
    await farm.pick('grain-order');
    await farm.action('order-grain');
    assert.match(await notice.innerText(), /Grain order.*-\$100.*\$720/i);
    await page.clock.runFor(450);
    assert.equal(await value('grain'), '1');
    await farm.click('Farm book');
    await farm.click('Feed');
    assert.match(await book.innerText(), /Latest change.+Grain order.+-\$100.+\$720/is);
    await page.clock.runFor(1500);
    assert.equal(await value('grain'), '5');
    assert.match(await book.innerText(), /Latest change.+4 units of grain added/is);
    await farm.click('Close');
    assert.match(await notice.innerText(), /4 units of grain added/i);

    await reload();
    await farm.click('Farm book');
    assert.match(await book.innerText(), /Latest change.+4 units of grain added/is);
    await farm.click('Close');
    assert.equal(await value('grain'), '5');

    await farm.feed({ order: false });
    assert.match(await notice.innerText(), /3 units of grain used.*Piglets.*Pen 1/i);
    await farm.click('Farm book');
    assert.match(await book.innerText(), /Latest change.+3 units of grain used.+Piglets.+Pen 1/is);
    await farm.click('Close');
    assert.equal(await value('grain'), '2');
    await farm.closeWeek();
    assert.match(await notice.innerText(), /Week 2 closed.*-\$80.*\$640/i);

    await reload();
    await farm.click('Farm book');
    await farm.click('Sales');
    assert.match(await book.innerText(), /Latest change.+Week 2 closed.+-\$80.+\$640/is);
    assert.match(await book.innerText(), /Receipts.+\$200.+Spending.+\$560.+Net cash movement.+-\$360/is);
    assert.equal(await value('cash'), '$640');
    await farm.click('Close');

    for (let week = 3; week <= 6; week += 1) {
      await farm.feed();
      if (week === 6) await farm.sell('market', '1', 1);
      await farm.closeWeek();
    }
    const recap = game.getByRole('dialog', { name: 'Season recap', exact: true });
    assert.match(await recap.getByRole('status').innerText(), /Week 6 closed.*-\$80.*\$370/i);
    await farm.click('Farm book');
    await farm.click('Pens');
    assert.match(await book.innerText(), /Latest change.+Week 6 closed.+-\$80.+\$370/is);
    assert.match(await book.innerText(), /Litter.+6 fed weeks · Season closed/is);
  });
}
