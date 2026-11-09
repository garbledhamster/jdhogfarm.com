export function createFarm() {
  return {
    week: 1,
    cash: 1000,
    grain: 0,
    plots: [
      { id: '1', status: 'wooded' },
      { id: '2', status: 'locked' },
      { id: '3', status: 'locked' }
    ]
  };
}

const plotStages = {
  'clear-plot': { from: 'wooded', to: 'cleared' },
  'build-pen': { from: 'cleared', to: 'fenced' }
};

export function applyFarmAction(state, { type, id }) {
  const stage = Object.hasOwn(plotStages, type) && plotStages[type];
  const plot = state.plots.find(candidate => candidate.id === id);
  if (!stage || plot?.status !== stage.from) {
    return { state, error: 'That plot is not ready for this step.' };
  }
  const plots = state.plots.map(candidate => candidate === plot
    ? { ...plot, status: stage.to }
    : candidate);
  return { state: { ...state, plots }, error: null };
}
