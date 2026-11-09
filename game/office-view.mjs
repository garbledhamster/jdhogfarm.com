import { renderFeedForecast, renderFeedingGroups } from './chores-view.mjs';
import { endWeekBlocker, feedForecast, formatCash, OVERHEAD, saleGroups, SEASON_GOAL, SEASON_WEEKS } from './morning.mjs';

const chapters = [
  {
    title: 'The first morning',
    joe: 'Clear the wooded plot and build the first pen. Once it’s fenced, Farm Supply can bring up to four starters.',
    debbie: 'Order grain at the Barn when the litter arrives. Carry a bucket to the piglet pen, then come see me to close the books.'
  },
  {
    title: 'One week at a time',
    joe: 'A full morning’s feed adds one fed week. The litter needs grain. The growers can eat what’s ready in the pasture.',
    debbie: 'Check the Barn forecast before you carry the bucket. The pickup buyer pays $200 for a hog with two through five fed weeks.'
  },
  {
    title: 'A choice for the spare plot',
    joe: 'Once we’ve sold a feeder, we can leave the first spare plot in grass or use it for a pen.',
    debbie: 'At Farm Supply, check what the kit and pigs would cost. See how much feed those extra pigs will need before you spend.'
  },
  {
    title: 'Give the grass a rest',
    joe: 'A paddock gives us three mornings of forage. Close it for two weeks and the grass can come back.',
    debbie: 'It’s free to open the other paddock when it’s ready. Check the Barn forecast after you rotate.'
  },
  {
    title: 'Nearly ready for market',
    joe: 'Market hogs need six fed weeks. If the litter has had every meal so far, one more morning will bring them up to size.',
    debbie: 'The butcher pays $450 per hog. Keep enough in the account for our last $80 bill.'
  },
  {
    title: 'Before we shut the gate',
    joe: 'Feed first, then see which hogs have reached market size. You can sell them this morning.',
    debbie: 'Come by after the pickup. To finish the season, we need a feeder sale, a market sale and money left after the last bill.'
  }
];

const destinations = {
  barn: 'Return to Barn',
  pasture: 'Go to Pasture',
  supply: 'Go to Farm Supply',
  route: 'Return to feed run',
  piglets: 'Go to piglet pen'
};

function button(label, attributes, primary = false) {
  return `<button class="farm-small-button${primary ? ' farm-primary-action' : ''}" type="button" ${attributes}>${label}</button>`;
}

function counts(amount, name, plural = `${name}s`) {
  return `${amount} ${amount === 1 ? name : plural}`;
}

function nextOfficeAction(state, { route }) {
  const blocker = endWeekBlocker(state);
  if (blocker) {
    const place = blocker.place === 'route' && route?.status === 'arrived' ? 'piglets' : blocker.place;
    return {
      note: blocker.message,
      actions: button(destinations[place], `data-place="${place}"`, true)
    };
  }

  const marketReady = !state.sales.market && saleGroups(state, 'market').length;
  const feederReady = !state.sales.feeder && saleGroups(state, 'feeder').length;
  const checkOrders = marketReady || feederReady
    ? button('Check Orders', 'data-place="orders"', state.week === SEASON_WEEKS)
    : '';
  return {
    note: marketReady ? 'A market hog is ready. You can sell it before you close the books.'
      : feederReady ? 'A feeder is ready. You can arrange a pickup before you close the books.'
        : 'The morning’s work is in the books.',
    actions: checkOrders + button('End Week', `data-action="end-week" data-week="${state.week}"`, !checkOrders || state.week !== SEASON_WEEKS)
  };
}

function officeArt(state) {
  const portrait = state.result === 'won' || state.sales.market ? 'debbie-settled' : 'debbie';
  return `<svg viewBox="0 0 1200 530" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
    <ellipse cx="925" cy="485" rx="41" ry="8" fill="#302018" opacity=".22"></ellipse>
    <image href="game/art/${portrait}-avatar.webp" x="827" y="201" width="196" height="286"
      preserveAspectRatio="xMidYMax meet"></image>
  </svg>`;
}

function officeFacts(state) {
  const finalWeek = state.week === SEASON_WEEKS;
  return `<dl class="farm-office-facts">
    <div><dt>Cash now</dt><dd>${formatCash(state.cash)}</dd></div>
    <div><dt>${finalWeek ? 'Last bill' : 'Next bill'}</dt><dd>${formatCash(OVERHEAD)}</dd></div>
    <div><dt>${finalWeek ? 'Closing cash' : 'After the bill'}</dt><dd>${formatCash(state.cash - OVERHEAD)}</dd></div>
  </dl>`;
}

function nextMorningForecast(state) {
  return state.feeding && state.week < SEASON_WEEKS
    ? renderFeedForecast(state, feedForecast(state, { next: true }), { focusable: true })
    : '';
}

export function renderOfficePlace(place, state, context) {
  if (place !== 'office') return null;
  const art = officeArt(state);
  if (state.result) {
    return {
      art,
      controls: `<div class="farm-office-controls">${button('Season recap', 'data-open="recap"', true)}</div>`,
      details: `<p>The season is closed. Cash after the last bill is ${formatCash(state.cash)}.</p>`
    };
  }
  const next = nextOfficeAction(state, context);
  const forecast = nextMorningForecast(state);
  const facts = officeFacts(state);
  return {
    art,
    controls: `<div class="farm-office-controls">${button('Debbie’s books', 'data-open="ledger"', true)}</div>`,
    details: `<div class="farm-office-content">${forecast || facts}
      <div class="farm-office-actions">${next.actions}</div>
      <p>${next.note}</p>${forecast ? facts : ''}</div>`
  };
}

function ledgerRows(state, week = state.week) {
  const entries = state.ledger.filter(entry => entry.week === week);
  if (!entries.length) return '<p>No purchases or sales this morning.</p>';
  return `<table class="farm-office-ledger">
    <caption>Week ${week} ledger</caption>
    <thead><tr><th scope="col">Entry</th><th scope="col">Change</th><th scope="col">Balance</th></tr></thead>
    <tbody>${entries.map(entry => {
      const quantity = entry.quantity ? ` × ${entry.quantity}` : '';
      const sign = entry.amount > 0 && entry.type !== 'opening' ? '+' : '';
      return `<tr><th scope="row">${entry.label}${quantity}</th><td>${sign}${formatCash(entry.amount)}</td><td>${formatCash(entry.balance)}</td></tr>`;
    }).join('')}</tbody>
  </table>`;
}

function feedingReport(state) {
  if (!state.feeding) return '<p>Feeding is still open for this morning.</p>';
  const { demand, forage, grainUsed, shortfall } = state.feeding;
  const short = shortfall ? ` The herd was short by ${counts(shortfall, 'feed unit')}.` : '';
  return `<p>${demand} to feed. ${forage} from grass and ${grainUsed} from the bin.${short}</p>${renderFeedingGroups(state.feeding)}`;
}

function renderLedger(state, context) {
  const next = nextOfficeAction(state, context);
  return {
    title: `Debbie’s books · Week ${state.week}`,
    body: `${nextMorningForecast(state)}${officeFacts(state)}
      <section class="farm-office-content" aria-label="Morning feeding">
        <h4>Morning feeding</h4>${feedingReport(state)}
      </section>
      ${ledgerRows(state)}<p>${next.note}</p>`,
    actions: next.actions
  };
}

function helpJournal(state, seenStories) {
  const weeks = chapters.map((chapter, index) => {
    const week = index + 1;
    const label = `Week ${week} · ${chapter.title}`;
    return `<li>${seenStories.has(week) ? button(label, `data-open="story" data-story-week="${week}"`)
      : `<span>Week ${week} · Unread</span>`}</li>`;
  }).join('');

  return {
    title: 'Help journal',
    body: `<h4>Season goals</h4><p>${SEASON_GOAL}</p>
      <p>Use the map to visit a place. Check the Barn forecast, choose when to sell in Orders, and select End Week in the Office.</p>
      <p>Talk to Joe or Debbie in Week ${state.week} to add that conversation to the journal.</p>
      <h4>Conversations</h4><ol class="farm-journal">${weeks}</ol>`,
    actions: button('Replay season…', 'data-open="replay"')
  };
}

function portraitLine(name, image, line) {
  return `<div class="farm-story-line"><img src="game/art/${image}-portrait.webp" alt="" width="640" height="512">
    <p><strong>${name}</strong> ${line}</p></div>`;
}

function renderStory(state, storyWeek) {
  const week = chapters[storyWeek - 1] ? storyWeek : state.week;
  const chapter = chapters[week - 1];
  return {
    title: `Week ${week} · ${chapter.title}`,
    body: `<div class="farm-office-content">${portraitLine('Joe', 'joe', chapter.joe)}
      ${portraitLine('Debbie', 'debbie', chapter.debbie)}</div>`
  };
}

function recapAdvice(state) {
  const litterShort = state.history.find(entry =>
    entry.feeding.groups.some(group => group.id === 'litter' && group.missing));
  const anyShort = state.history.find(entry => entry.feeding.shortfall);
  if (!state.sales.market && litterShort) {
    return `In Week ${litterShort.week}, the litter came up short. On your next run, check that the Barn has enough grain for the litter before you take the bucket.`;
  }
  if (!state.sales.feeder) return 'Once the starters reach two fed weeks, go to Orders and arrange a feeder pickup.';
  if (!state.sales.market) return 'After feeding in Week 6, open Orders and sell a hog with six fed weeks before you close the books.';
  if (state.cash <= 0) return 'Preview the cash left after a kit and starters at Farm Supply, then set aside money for the weekly bills.';
  if (anyShort) return `In Week ${anyShort.week}, a group came up short. Next time, check the Barn forecast after opening a ready paddock.`;
  if (state.plots[1].forage) return 'Try converting the spare grass to a pen after a feeder sale. Check the forecast before you add more pigs.';
  if (state.ledger.some(entry => entry.type === 'kit')) return 'Try keeping the first spare plot in grass after a feeder pickup. Check the Barn for the forage it adds.';
  return 'Try reinvesting part of the first feeder sale in a pen kit. Preview how much grain the extra pigs will need.';
}

function endingExchange(state) {
  const missedSale = !state.sales.feeder && !state.sales.market ? 'a feeder sale or a market hog sale'
    : !state.sales.feeder ? 'a feeder sale'
      : !state.sales.market ? 'a market hog sale' : '';
  const joe = missedSale ? `We closed without ${missedSale}.` : 'We made both sales.';
  const cashLeft = `There’s ${formatCash(state.cash)} left after the last bill.`;
  const debbie = state.result === 'won' ? `${cashLeft} Time to shut the gate for the season.`
    : state.cash > 0 ? cashLeft
      : state.cash === 0 ? 'The last bill used the rest of our cash. We needed money left to finish the season.'
        : `We’re short by ${formatCash(-state.cash)} after the last bill. We needed money left to finish the season.`;
  return `<section class="farm-office-content farm-ending-exchange" aria-label="Closing exchange">
    ${portraitLine('Joe', missedSale ? 'joe-concerned' : 'joe', joe)}
    ${portraitLine('Debbie', state.result === 'won' ? 'debbie-settled' : 'debbie', debbie)}
  </section>`;
}

function seasonRecap(state) {
  const won = state.result === 'won';
  const lastBill = state.ledger.findLast(entry => entry.type === 'overhead');
  const results = [
    state.sales.feeder ? `${counts(state.sales.feeder, 'feeder hog')} sold.` : 'No feeder sale.',
    state.sales.market ? `${counts(state.sales.market, 'market hog')} sold.` : 'No market hog sale.',
    `${formatCash(lastBill?.balance ?? state.cash)} after the last bill.`
  ];
  const history = state.history.map(({ week, feeding, cash }) => {
    const feed = feeding.shortfall ? `Feed short by ${feeding.shortfall}`
      : feeding.demand ? 'All groups fed' : 'No hogs to feed';
    return `<li><span>Week ${week}</span><span>${feed}</span><strong>${formatCash(cash)}</strong></li>`;
  }).join('');
  return {
    title: 'Season recap',
    body: `<section class="farm-office-content" aria-label="Season result">
      <h4>${won ? 'You finished the season' : 'The season fell short'}</h4>
      ${endingExchange(state)}
      <div class="farm-office-actions">${button('Closing ledger', 'data-open="ledger"', true)}</div>
      <ul class="farm-recap-results">${results.map(result => `<li>${result}</li>`).join('')}</ul>
      </section>
      <h4>Each week after the bill</h4><ol class="farm-recap-weeks">${history}</ol>
      <h4>On your next run</h4><p>${recapAdvice(state)}</p>`,
    actions: button('Replay season', 'data-action="replay"')
  };
}

function closingLedger(state) {
  return {
    title: 'Closing ledger',
    body: `<p>Cash after the last bill <strong>${formatCash(state.cash)}</strong></p>
      ${state.history.map(({ week }) => ledgerRows(state, week)).join('')}`,
    actions: button('Back to recap', 'data-open="recap"') + button('Replay season', 'data-action="replay"', true)
  };
}

export function renderOfficeDecision(panel, state, context) {
  switch (panel) {
    case 'ledger': return state.result ? closingLedger(state) : renderLedger(state, context);
    case 'help': return helpJournal(state, context.seenStories);
    case 'story': return renderStory(state, context.storyWeek);
    case 'recap': return state.result ? seasonRecap(state) : null;
    case 'replay': return {
      title: 'Start a fresh season?',
      body: '<p>Start with the first wooded plot, $1,000 and an empty bin. This clears your current season, including any truck or bucket trip.</p>',
      actions: button('Replay season', 'data-action="replay"', true) + button('Cancel', 'data-panel-close')
    };
    default: return null;
  }
}
