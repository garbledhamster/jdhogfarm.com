const ROUTE_MS = 5600;
const ASSIST_MS = 2400;
const FRAME_MS = 40;
const ARRIVAL_MS = 400;
const UNLOAD_MS = 780;

const rock = { id: 'rock', at: 0.5, lane: 1 };
const snake = { id: 'snake', at: 0.71, lane: 2 };
const movingSnake = { id: 'moving-snake', at: 0.85 };
const hazards = [[rock], [rock, snake], [rock, snake, movingSnake]];

function obstacleLane(obstacle, progress) {
  return obstacle.lane ?? 1.5 + 0.5 * Math.sin(progress * 14);
}

export function createChores({
  onRouteChange = () => {},
  onDeliveryChange = () => {},
  onDelivery = () => {},
  onArrive = () => {},
  now = () => performance.now(),
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancel = handle => clearTimeout(handle)
} = {}) {
  let week;
  let active = false;
  let hasBucket = false;
  let route = null;
  let routeTimer = null;
  let delivery = null;

  function obstacleSet() {
    return hazards[Math.min(week ?? 1, hazards.length) - 1];
  }

  function routeSnapshot() {
    if (!route) return null;
    return {
      ...route,
      obstacles: obstacleSet().map(obstacle => ({ ...obstacle, lane: obstacleLane(obstacle, route.progress) }))
    };
  }

  function publishRoute(progressOnly = false) {
    onRouteChange(routeSnapshot(), { progressOnly });
  }

  function stopRoute() {
    if (routeTimer) cancel(routeTimer.handle);
    routeTimer = null;
  }

  function queueRoute() {
    if (routeTimer || !active || route?.status !== 'walking') return;
    const timer = { started: now() };
    routeTimer = timer;
    timer.handle = schedule(() => {
      if (routeTimer !== timer) return;
      routeTimer = null;
      advanceRoute(now() - timer.started);
      queueRoute();
    }, FRAME_MS);
  }

  function advanceRoute(elapsed) {
    const progress = Math.min(1, route.progress + elapsed / (route.assisted ? ASSIST_MS : ROUTE_MS));
    const hit = !route.assisted && obstacleSet().find(obstacle =>
      route.progress < obstacle.at && progress >= obstacle.at && route.lane === Math.round(obstacleLane(obstacle, obstacle.at))
    );
    if (hit) {
      route = { ...route, progress: hit.at, status: 'blocked', hit: hit.id };
      publishRoute();
      return;
    }
    route = { ...route, progress, status: progress === 1 ? 'arrived' : 'walking' };
    if (progress === 1) onArrive();
    else publishRoute(true);
  }

  function enterRoute(status) {
    stopRoute();
    route = { status, lane: 1, progress: status === 'arrived' ? 1 : 0, assisted: false, hit: null };
    publishRoute();
    queueRoute();
    return true;
  }

  function routeAction(type, target) {
    switch (type) {
      case 'prepare-route':
        return hasBucket && enterRoute('ready');
      case 'restore-arrived-route':
        return hasBucket && enterRoute('arrived');
      case 'walk-route':
        return route?.status === 'ready' && enterRoute('walking');
      case 'retry-route':
        return route?.status === 'blocked' && enterRoute('walking');
      case 'route-lane':
        if (route?.status !== 'walking' || route.assisted || ![0, 1, 2].includes(target)) return false;
        if (route.lane !== target) {
          route = { ...route, lane: target };
          publishRoute();
        }
        return true;
      case 'assist-route':
        if (!route || route.status === 'arrived' || route.assisted) return false;
        route = { ...route, status: 'walking', lane: 0, assisted: true, hit: null };
        publishRoute();
        queueRoute();
        return true;
      default:
        return false;
    }
  }

  function stopDelivery() {
    if (delivery) cancel(delivery.handle);
    delivery = null;
  }

  function syncDelivery(shipment) {
    if (delivery?.id === shipment?.id) return;
    stopDelivery();
    if (!shipment) return;
    const job = { id: shipment.id, stage: 'arriving' };
    delivery = job;
    job.handle = schedule(() => {
      if (job !== delivery) return;
      job.stage = 'unloading';
      job.handle = schedule(() => {
        if (job !== delivery) return;
        job.stage = 'delivered';
        onDelivery(job.id);
      }, UNLOAD_MS);
      onDeliveryChange();
    }, ARRIVAL_MS);
  }

  return {
    get route() { return routeSnapshot(); },
    get deliveryStage() { return delivery?.stage ?? null; },
    routeAction,
    sync({ week: currentWeek, shipment, active: routeVisible, hasBucket: reserved = true }) {
      hasBucket = reserved;
      if (week !== currentWeek || !hasBucket) {
        stopRoute();
        route = null;
        week = currentWeek;
      }
      active = routeVisible && hasBucket;
      if (active) queueRoute();
      else stopRoute();
      syncDelivery(shipment);
    },
    reset() {
      stopRoute();
      stopDelivery();
      route = null;
      active = false;
      hasBucket = false;
    }
  };
}
