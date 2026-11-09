import assert from 'node:assert/strict';
import { test } from 'node:test';

export function registerOfficeBrowserTests(farmDriver) {
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
