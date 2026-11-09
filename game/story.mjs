import { eligibleForOrder, farmView, FEED_BUNDLE, formatCash, PADDOCK_COST } from './farm.mjs';

export const prologue = [
  {
    speaker: 'Joe Rice',
    art: 'opening-hogs', alt: 'Joe beside a hog at the fence',
    title: 'We could use a hand',
    text: 'Morning. We could use a hand with these four hogs. We’ve got six weeks to raise them and fill two orders.'
  },
  {
    speaker: 'Debbie Rice',
    art: 'opening-ledger', alt: 'Debbie at her ledger in the office',
    title: 'Two orders on the books',
    text: 'I’ve got two orders on the books. The feeder pickup is due in Week 4 and the whole-hog delivery in Week 6.'
  },
  {
    speaker: 'Joe Rice',
    art: 'opening-tractor', alt: 'Joe on the tractor by the pasture gate',
    title: 'Let’s start with the grass',
    text: 'Let’s check the pasture first. Open Paddock A and see how the grass covers our four hogs. When you’re ready, select End Week.'
  }
];

const chapters = [
  {
    title: 'The first morning',
    text: 'Come look at the grass with me. A fresh paddock can feed the four hogs we start with.',
    reply: 'That gives us a little breathing room. I’ll be in the Office keeping track of the feed money and the weekly bills.'
  },
  {
    title: 'One week at a time',
    text: 'See how the hogs are coming along? If we feed the whole herd, they all gain a fed week. If we run short, none of them do.',
    reply: 'Then let’s see what’s in the bin. Check the feed outlook in the Barn before you spend anything.'
  },
  {
    title: 'Someone’s coming for feeders',
    text: 'I’ll be by the gate. Two pigs can go as feeders once they’ve each had two fed weeks.',
    reply: 'Confirm the pickup in Orders when they’re ready. It’s due by the end of Week 4.',
    order: 'A',
    fulfilledReply: 'That pickup’s already in the books. Now we can put that money toward the hogs we’re keeping for delivery.'
  },
  {
    title: 'Give the grass a rest',
    text: 'Grass needs time to come back. If the hogs have eaten it down, let that paddock rest and look for one that’s ready.',
    reply: `Opening a ready paddock costs ${formatCash(PADDOCK_COST)}. If the feeder pickup is still open, check Orders before this week ends.`,
    order: 'A',
    fulfilledReply: 'The pickup’s settled. Let’s compare what we’d spend on fresh grass with what we’d spend on feed.'
  },
  {
    title: 'The second order',
    text: 'The butcher needs two hogs with four fed weeks each. If they’re one fed week short, make sure they eat this week.',
    reply: 'If they’re ready, confirm the delivery in Orders. They have to be ready before Week 6 ends, when the order closes.',
    order: 'B',
    fulfilledReply: 'I’ve crossed that delivery off. Let’s keep enough in the account to cover the last of the bills.'
  },
  {
    title: 'Before we shut the gate',
    text: 'I’ll check the gate one last time. Thanks for seeing the season through with us.',
    reply: 'If the hogs are ready, confirm the delivery before you end the week. This week’s growth comes too late for the order.',
    order: 'B',
    fulfilledReply: 'The delivery’s in the books. Come by the Office and we’ll see what’s left after the last bill.'
  }
];

export function chapterFor(week, state) {
  const chapter = chapters[week - 1];
  const view = farmView(state);
  const portraits = {
    joe: characterVariant('joe', state, view),
    debbie: characterVariant('debbie', state, view)
  };
  if (state.result) return {
    title: chapter.title,
    text: 'The season’s over. Thanks for lending us a hand.',
    reply: 'Open the season recap and we’ll go over the books together.',
    portraits
  };
  const order = state.orders.find(candidate => candidate.id === chapter.order);
  const result = { title: chapter.title, text: chapter.text, reply: chapter.reply, portraits };
  if (order?.status === 'fulfilled') result.reply = chapter.fulfilledReply;
  if (order?.status === 'open' && eligibleForOrder(state, order) < order.quantity) {
    const label = order.label.toLowerCase();
    result.reply = view.week === order.deadline
      ? `We’re short of eligible pigs for the ${label}. It closes this week, and any growth we get when the week ends comes too late.`
      : `We still need ${order.quantity} pigs with ${order.minFedWeeks} fed weeks each for the ${label}. It’s due at the end of Week ${order.deadline}.`;
  }
  const { shortfall } = view.forecast;
  if (shortfall) {
    result.text = `We’re short by ${shortfall} ${shortfall === 1 ? 'feed unit' : 'feed units'} this week. ${shortageChoice(state)}`;
  }
  return result;
}

function shortageChoice(state) {
  const canRotate = state.cash >= PADDOCK_COST && state.paddocks.some(plot => plot.status === 'ready');
  const canBuyFeed = state.cash >= FEED_BUNDLE.cost;
  if (canRotate && canBuyFeed) return 'Check a ready paddock or the feed bin before ending the week.';
  if (canRotate) return 'Check the ready paddock before ending the week.';
  if (canBuyFeed) return 'Check the feed bin before ending the week.';
  return 'Check the ledger and any open orders before ending the week.';
}

export function nextChore(scene, state, view, inspectedFirstPaddock = false) {
  if (state.result) return 'Open the season recap to see how we did.';

  switch (scene) {
    case 'pasture': {
      const active = state.paddocks.find(plot => plot.status === 'active');
      if (view.forecast.shortfall) return shortageChoice(state);
      if (state.completedWeeks === 0 && active?.id === 'A' && view.herd === 4) {
        return inspectedFirstPaddock ? 'The grass covers all four hogs. Select End Week when you’re ready.' : 'Open Paddock A to see how its grass covers all four hogs. Then select End Week when you’re ready.';
      }
      if (state.completedWeeks === 1) return 'We’ve finished the first week. Go to the Barn to check the herd.';
      const feederOrder = state.orders.find(order => order.id === 'A' && order.status === 'open');
      if (feederOrder && eligibleForOrder(state, feederOrder) >= feederOrder.quantity) {
        return 'The feeders are ready. Go to Orders to confirm the pickup.';
      }
      if (active?.productiveWeeks === 1) return 'One week of grass left here. Check the other paddock.';
      if (!active) return 'Neither paddock is active. Check the feed outlook in the Barn.';
      return 'Check the active paddock before the grass runs out.';
    }
    case 'barn':
      if (view.forecast.shortfall) return shortageChoice(state);
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

export function characterVariant(person, state, view) {
  if (person === 'joe' && !state.result && view.forecast.shortfall) return 'joe-concerned';
  const featured = state.orders.find(order => order.id === (view.week <= 4 ? 'A' : 'B'));
  if (person === 'debbie' && featured?.status === 'fulfilled') return 'debbie-settled';
  return person;
}
