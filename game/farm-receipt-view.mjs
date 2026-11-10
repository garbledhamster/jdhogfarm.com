import { formatCash, GRAIN_BUNDLE } from './morning.mjs';

export function formatCashChange(amount) {
  return `${amount > 0 ? '+' : ''}${formatCash(amount)}`;
}

export function describeFarmReceipt(state) {
  switch (state.lastOutcome) {
    case 'cash': {
      const { week, label, type, amount, balance } = state.ledger.at(-1);
      const action = type === 'overhead' ? `Week ${week} closed. Debbie posted the ${formatCash(-amount)} bill.`
        : type === 'grain' ? 'Grain order' : label;
      return `${action} · ${formatCashChange(amount)} · Cash now ${formatCash(balance)}`;
    }
    case 'delivery':
      return `Grain ready. ${GRAIN_BUNDLE.units} units of grain added to the bin.`;
    case 'feeding': {
      const { groups, grainUsed } = state.feeding;
      const grew = groups.filter(group => group.grew).map(group => group.id === 'litter' ? 'Piglets' : `Pen ${group.id}`);
      const growth = grew.length ? `Grew: ${grew.join(', ')}.` : 'No groups grew.';
      return `Feeding complete. ${grainUsed} ${grainUsed === 1 ? 'unit' : 'units'} of grain used. ${growth}`;
    }
    default: return '';
  }
}
