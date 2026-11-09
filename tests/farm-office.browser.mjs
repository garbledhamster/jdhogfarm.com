import assert from 'node:assert/strict';
import { test } from 'node:test';

export function registerOfficeBrowserTests(farmDriver) {
  for (const [width, height] of [[320, 568], [667, 375]]) {
    test(`Office puts the next morning shortage before End Week at ${width} × ${height}`, async t => {
      const farm = await farmDriver(t, 'keyboard', { reducedMotion: 'reduce' });
      await farm.build();
      await farm.go('supply');
      await farm.stock('1', 2);
      await farm.feed();
      await farm.sell('feeder', '1', 1);
      await farm.page.setViewportSize({ width, height });
      await farm.go('office');

      async function checkForecast(container, inBooks = false) {
        const warning = container.getByText(/Next morning.+Short by 2 units/is);
        const endWeek = container.getByRole('button', { name: 'End Week', exact: true });
        const endHandle = await endWeek.elementHandle();
        const layout = await warning.evaluate((forecast, end) => {
          const bounds = forecast.getBoundingClientRect();
          const closeBounds = end.getBoundingClientRect();
          const area = forecast.closest('.farm-panel-body, .farm-information').getBoundingClientRect();
          const closeArea = end.closest('.farm-panel, .farm-information').getBoundingClientRect();
          return {
            precedesInDOM: Boolean(forecast.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING),
            precedesOnScreen: bounds.bottom <= closeBounds.top,
            readable: bounds.top >= area.top - 1 && bounds.bottom <= area.bottom + 1,
            closeVisible: closeBounds.top >= closeArea.top - 1 && closeBounds.bottom <= closeArea.bottom + 1
          };
        }, endHandle);
        assert.deepEqual(layout, {
          precedesInDOM: true, precedesOnScreen: true, readable: true, closeVisible: true
        });
        if (inBooks) {
          await farm.page.keyboard.press('Tab');
          assert.equal(await container.getByRole('button', { name: 'Close', exact: true }).evaluate(node =>
            node === document.activeElement), true);
        }
        await farm.page.keyboard.press('Tab');
        assert.equal(await warning.evaluate(node => node === document.activeElement), true);
        await farm.page.keyboard.press('Tab');
        assert.equal(await endWeek.evaluate(node => node === document.activeElement), true);
      }

      await checkForecast(farm.game.locator('.farm-summary'));
      await farm.pick('ledger');
      await checkForecast(farm.game.getByRole('dialog', { name: /Debbie’s books/ }), true);
    });
  }

  test('Office activation bursts close only the current week when the farm is empty', async t => {
    const farm = await farmDriver(t, 'pointer', { reducedMotion: 'reduce' });
    await farm.build();
    await farm.go('supply');
    await farm.stock('1', 1);
    await farm.feed();
    await farm.sell('feeder', '1', 1);
    await farm.closeWeek();
    await farm.feed();
    await farm.sell('feeder', 'litter', 3);
    assert.equal(await farm.value('herd'), '0');
    assert.equal(await farm.value('cash'), '$1,420');

    const barn = farm.game.getByRole('heading', { name: 'Barn', exact: true });
    const endWeek = farm.game.getByRole('button', { name: 'End Week', exact: true });
    await farm.go('office');
    await endWeek.evaluate(button => {
      const summary = button.closest('.farm-summary');
      button.click();
      summary.querySelector('[data-action="end-week"]')?.click();
    });
    assert.equal(await farm.value('week'), 'Week 3 of 6');
    assert.equal(await farm.value('cash'), '$1,340');
    assert.match(await farm.game.locator('#farm-notice').innerText(), /Week 2 closed.*\$80/);
    assert.equal(await barn.evaluate(node => node === document.activeElement), true);

    await farm.go('office');
    await endWeek.dblclick();
    assert.equal(await farm.value('week'), 'Week 4 of 6');
    assert.equal(await farm.value('cash'), '$1,260');
    await barn.waitFor();
    assert.equal(await farm.game.locator('#farm-panel').isHidden(), true);

    await farm.go('office');
    await endWeek.focus();
    await farm.page.keyboard.press('Enter');
    await farm.page.keyboard.press('Enter');
    assert.equal(await farm.value('week'), 'Week 5 of 6');
    assert.equal(await farm.value('cash'), '$1,180');
    assert.equal(await barn.evaluate(node => node === document.activeElement), true);
  });
}
