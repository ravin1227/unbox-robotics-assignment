// Track sensor activity and detect offline status
const SENSOR_TIMEOUT = 10000; // 10 seconds without data = offline
const sensorStatus = new Map();

export function updateSensorActivity(sensorId) {
  const now = Date.now();
  const prev = sensorStatus.get(sensorId);

  sensorStatus.set(sensorId, {
    sensorId,
    lastUpdate: now,
    isOnline: true,
  });

  // Detect transition from offline to online
  if (prev && !prev.isOnline) {
    return { type: 'online', sensorId, timestamp: new Date().toISOString() };
  }

  return null;
}

export function checkSensorStatus(sensorId) {
  const status = sensorStatus.get(sensorId);
  if (!status) return 'unknown';

  const timeSinceUpdate = Date.now() - status.lastUpdate;
  if (timeSinceUpdate > SENSOR_TIMEOUT) {
    return 'offline';
  }

  return 'online';
}

// Periodic check for offline sensors
let statusCheckInterval = null;

export function startStatusCheck(callback) {
  if (statusCheckInterval) return;

  statusCheckInterval = setInterval(() => {
    const now = Date.now();
    sensorStatus.forEach((status, sensorId) => {
      const timeSinceUpdate = now - status.lastUpdate;
      const isCurrentlyOnline = timeSinceUpdate <= SENSOR_TIMEOUT;

      if (status.isOnline && !isCurrentlyOnline) {
        // Sensor went offline
        status.isOnline = false;
        callback({
          type: 'offline',
          sensorId,
          lastUpdate: new Date(status.lastUpdate).toISOString(),
          offlineFor: Math.round(timeSinceUpdate / 1000),
        });
      }
    });
  }, 2000); // Check every 2 seconds
}

export function stopStatusCheck() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
    statusCheckInterval = null;
  }
}