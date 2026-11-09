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
    text: 'I start out here under the oaks. Paddock A has enough grass for all four pigs. Let’s check on them at the barn next week.',
    reply: 'The bills come out at the end of each week. Give me a holler at the Office if you want a look at the ledger.'
  },
  {
    title: 'One week at a time',
    text: 'Take a look at the hogs. Each pig that got enough to eat gained a fed week. That’s how they get ready for an order.',
    reply: 'Check the feed outlook while you’re at the barn. If the grass and feed we have cover the herd, keep your money in your pocket.'
  },
  {
    title: 'Someone’s coming for feeders',
    text: 'That first pickup is getting close. We can send two pigs once they’ve had two fed weeks. We’ll keep feeding the others for the later delivery.',
    reply: 'Confirm the pickup in Orders when they’re ready. I’ll put the payment in the books. It’s due by the end of Week 4.'
  },
  {
    title: 'Give the grass a rest',
    text: 'A good patch of grass only lasts so long. If the hogs have eaten it down, let that paddock rest and put them on a ready one.',
    reply: 'Compare what a fresh paddock costs with what you’d spend on feed. And if the pickup’s still open, this is the week to finish it.'
  },
  {
    title: 'The second order',
    text: 'The whole-hog delivery needs two pigs with four fed weeks each. If they need another week, check the grass and feed bin before the clock runs down.',
    reply: 'I’ve got the butcher’s order right here. If both hogs are ready, confirm the delivery now. That’s one less thing to do before we close up.'
  },
  {
    title: 'Before we shut the gate',
    text: 'I’ll check the gate one last time. If the whole-hog delivery is still open and the pigs are ready, go ahead and confirm it.',
    reply: 'Meet me back at the Office. We’ll see what came in from the orders and what we spent. Thanks for sticking with us through the season.'
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
