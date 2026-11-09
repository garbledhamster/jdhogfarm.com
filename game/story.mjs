import { eligibleForOrder } from './farm.mjs';

export const prologue = [
  {
    speaker: 'Joe Rice',
    portrait: 'joe',
    title: 'We could use a hand',
    text: 'Morning. Debbie’s getting the books ready, and I’m headed out to check the hogs. Come with me? We’ve got four pigs to look after and six weeks to get the work done.'
  },
  {
    speaker: 'Debbie Rice',
    portrait: 'debbie',
    title: 'Two orders on the books',
    text: 'I’ve got two orders written down. The feeder pickup is due by Week 4, and the whole-hog delivery by Week 6. I’ll be in the Office if you want to look at the ledger before you spend anything.'
  },
  {
    speaker: 'Joe Rice',
    portrait: 'joe',
    title: 'Let’s start with the grass',
    text: 'The clock waits until you press Start season. Tap a pig, a sign, or one of us for help. We’ll check the pasture first, then see how the herd is getting along.'
  }
];

const chapters = [
  {
    title: 'The first morning',
    text: 'I start out here under the oaks. Paddock A has enough grass for our four pigs this week. Once you’ve looked around, start the season. We’ll see how they’re growing when the first week is done.'
  },
  {
    title: 'One week at a time',
    text: 'You can tell more from a trip to the barn than you can from the calendar. If every pig got enough to eat, they each gained a fed week. The feed bin is there for the weeks when the grass can’t cover everybody.'
  },
  {
    title: 'Someone’s coming for feeders',
    text: 'That first pickup is getting close. We can send two pigs once they’ve had two fed weeks. If you’ve got two ready, confirm the pickup in Orders. We’ll keep feeding the other two for the later delivery.'
  },
  {
    title: 'Give the grass a rest',
    text: 'A good patch of grass only lasts so long. Once a paddock runs out, rest it and move the herd to a ready paddock. Debbie can show you what the move costs. If the first pickup is still open, this is its last week.'
  },
  {
    title: 'The second order',
    text: 'The whole-hog delivery needs two pigs with four fed weeks each. Take a look at Orders. If they’re ready, you can confirm the delivery now. If they need another fed week, check the grass and feed bin before the clock runs down.'
  },
  {
    title: 'Before we shut the gate',
    text: 'One last look around. Make sure the whole-hog delivery is confirmed, then stop by the Office. Debbie will go over the ledger with us when the week is done. We want both orders filled and enough cash left to keep going.'
  }
];

export function chapterFor(week) {
  return chapters[week - 1];
}

export function nextChore(scene, state, view) {
  if (state.result) return 'Open the season recap to see how we did.';

  switch (scene) {
    case 'pasture': {
      const active = state.paddocks.find(plot => plot.status === 'active');
      if (!active) return 'We’re out of grass. Check a ready paddock before the next week.';
      if (state.completedWeeks === 0) return 'The grass can feed the herd this week. Press Start season.';
      if (state.completedWeeks === 1) return 'We’ve finished the first week. Go to the Barn to check the herd.';
      const feederOrder = state.orders.find(order => order.id === 'A' && order.status === 'open');
      if (feederOrder && eligibleForOrder(state, feederOrder) >= feederOrder.quantity) {
        return 'The feeders are ready. Go to Orders to confirm the pickup.';
      }
      if (active.productiveWeeks === 1) return 'One week of grass left here. Check the other paddock.';
      return 'Check the active paddock before the grass runs out.';
    }
    case 'barn':
      if (view.forecast.shortfall) return 'We’re short on feed. Open the feed bin before the week ends.';
      return 'Check the herd to see which pigs are ready for an order.';
    case 'orders': {
      const open = state.orders.filter(order => order.status === 'open');
      const ready = open.find(order => eligibleForOrder(state, order) >= order.quantity);
      if (ready) return `Pigs are ready. Open ${ready.label.toLowerCase()} to confirm it.`;
      return open.length ? 'Check the due dates, then check the herd in the Barn.' : 'The orders are closed. Check the ledger in the Office.';
    }
    case 'office':
      return 'Open the ledger to check the bills before you spend.';
  }
}

export const seasonLines = {
  won: 'Both orders went out and Debbie says there’s money left in the book. Thanks for lending us a hand. Let’s shut the gate.',
  lost: 'We’ve still got some money, but we let an order slip. Before we try again, let’s see which week got away from us.',
  bankrupt: 'We ran out of money before we finished. Debbie’s got the last bill in the ledger. Let’s see what we can do differently next time.'
};
