const ROUTE_MS = 5600;
const ASSIST_MS = 2400;
const FARTHER_MS = 2000;
const FARTHER_ASSIST_MS = 1000;
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
    if (route?.completedStops > 0) return [week >= 9 ? { ...snake, at: 0.6 } : { ...rock, at: 0.6 }];
    return hazards[Math.min(week ?? 1, hazards.length) - 1];
  }

  function tripProgress() {
    if (route.status === 'arrived') return 1;
    const completed = route.completedStops > 0 ? ROUTE_MS + (route.completedStops - 1) * FARTHER_MS : 0;
    const current = route.completedStops > 0 ? FARTHER_MS : ROUTE_MS;
    return (completed + current * route.progress) / (ROUTE_MS + (route.plan.length - 1) * FARTHER_MS);
  }

  function routeSnapshot() {
    if (!route) return null;
    return {
      ...route,
      tripProgress: tripProgress(),
      plan: route.plan.map(stop => ({ ...stop })),
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

  function progressAfter(elapsed) {
    const duration = route.completedStops > 0
      ? (route.assisted ? FARTHER_ASSIST_MS : FARTHER_MS)
      : (route.assisted ? ASSIST_MS : ROUTE_MS);
    return Math.min(1, route.progress + elapsed / duration);
  }

  function advanceRoute(elapsed) {
    const progress = progressAfter(elapsed);
    const hit = !route.assisted && obstacleSet().find(obstacle =>
      route.progress < obstacle.at && progress >= obstacle.at && route.lane === Math.round(obstacleLane(obstacle, obstacle.at))
    );
    if (hit) {
      route = { ...route, progress: hit.at, status: 'blocked', hit: hit.id };
      publishRoute();
      return;
    }
    if (progress === 1) {
      const completedStops = route.completedStops + 1;
      const arrived = completedStops === route.plan.length;
      route = { ...route, completedStops, progress: arrived ? 1 : 0, status: arrived ? 'arrived' : 'walking' };
      if (arrived) onArrive();
      else publishRoute();
    } else {
      route = { ...route, progress };
      publishRoute(true);
    }
  }

  function enterRoute(status, plan = route?.plan ?? [{ id: 'litter', grain: 0 }], completedStops = route?.completedStops ?? 0) {
    stopRoute();
    route = { status, lane: 1, progress: status === 'arrived' ? 1 : 0, assisted: false, hit: null,
      plan: plan.map(stop => ({ ...stop })), completedStops: status === 'arrived' ? plan.length : completedStops };
    publishRoute();
    queueRoute();
    return true;
  }

  function routeAction(type, target) {
    switch (type) {
      case 'prepare-route':
        return hasBucket && enterRoute('ready', target, 0);
      case 'restore-route':
        return hasBucket && enterRoute(target.completedStops === target.plan.length ? 'arrived' : 'ready', target.plan, target.completedStops);
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
    get milestone() { return route ? { plan: route.plan.map(stop => ({ ...stop })), completedStops: route.completedStops } : null; },
    get route() { return routeSnapshot(); },
    get paintProgress() {
      // Draw between ticks without moving collision checks or the arrival callback.
      if (!routeTimer) return route?.progress ?? 0;
      const projected = progressAfter(Math.min(FRAME_MS, now() - routeTimer.started));
      if (route.assisted) return projected;
      // Wait for the scheduler to resolve a crossing before drawing past its obstacle.
      const nextObstacle = obstacleSet().find(obstacle => obstacle.at > route.progress);
      return Math.min(projected, nextObstacle?.at ?? 1);
    },
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
