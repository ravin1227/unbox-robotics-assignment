import dotenv from 'dotenv';
import { processSpeedQueue, getQueueStats } from '../queue/speedQueue.js';
import { bulkInsertSpeedLogs } from '../db/db.js';
import { checkSensorStatus } from '../utils/sensorStatus.js';

dotenv.config();

console.log('Starting Speed Worker (Batch Mode: 60 records or 60sec timeout)...');

// Track last emitted update per sensor (to avoid duplicate logs)
const lastEmittedPerSensor = new Map();

// Batch configuration
const BATCH_SIZE = 60;
const BATCH_TIMEOUT_MS = 60000; // 60 seconds
let recordBuffer = [];
let flushTimeout = null;

// Function to flush buffer to database
async function flushBatch() {
  if (recordBuffer.length === 0) return;

  const recordsToInsert = [...recordBuffer];
  recordBuffer = [];

  try {
    await bulkInsertSpeedLogs(recordsToInsert);
    console.log(`[Worker] Flushed batch of ${recordsToInsert.length} records to database`);
  } catch (error) {
    console.error(`[Worker] Error flushing batch:`, error.message);
    throw error;
  }
}

// Function to schedule flush timeout
function scheduleFlush() {
  if (flushTimeout) clearTimeout(flushTimeout);
  flushTimeout = setTimeout(async () => {
    if (recordBuffer.length > 0) {
      console.log(`[Worker] 60s timeout reached, flushing ${recordBuffer.length} records`);
      await flushBatch();
    }
  }, BATCH_TIMEOUT_MS);
}

// Process jobs from the queue with full record data
processSpeedQueue(async (id, sensorId, speed, timestamp) => {
  try {
    // Add to buffer instead of immediate insert
    recordBuffer.push({ sensorId, speed, timestamp });
    const bufferProgress = `${recordBuffer.length}/${BATCH_SIZE}`;

    // Check if sensor is online for WebSocket emission
    const sensorStatus = checkSensorStatus(sensorId);
    const lastEmitted = lastEmittedPerSensor.get(sensorId);

    if (sensorStatus === 'online') {
      if (!lastEmitted || lastEmitted.speed !== speed) {
        console.log(`[Worker] Emitting update for ONLINE sensor: ${sensorId} (${bufferProgress} in queue)`);
        lastEmittedPerSensor.set(sensorId, { speed, timestamp });
      }
    } else {
      // Show buffer progress for offline sensors
      if (recordBuffer.length % 10 === 0 || recordBuffer.length === BATCH_SIZE) {
        console.log(`[Worker] ${bufferProgress} records waiting for DB flush`);
      }
    }

    // Schedule flush timeout if not already scheduled
    scheduleFlush();

    // Flush when buffer reaches batch size
    if (recordBuffer.length >= BATCH_SIZE) {
      console.log(`[Worker] Batch complete (${BATCH_SIZE}/60), writing to database...`);
      await flushBatch();
    }

    return { success: true, id, sensorId, speed, buffered: true };
  } catch (error) {
    console.error(`[Worker] Error processing record #${id} for ${sensorId}:`, error.message);
    throw error;
  }
});

// Log queue stats every 10 seconds
setInterval(async () => {
  const stats = await getQueueStats();
  if (stats) {
    console.log('Queue Stats:', stats);
  }
}, 10000);

// Graceful shutdown - flush buffer before exit
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received - shutting down worker gracefully...`);

  if (flushTimeout) clearTimeout(flushTimeout);

  if (recordBuffer.length > 0) {
    console.log(`Flushing ${recordBuffer.length} pending records before exit...`);
    try {
      await flushBatch();
      console.log(`All pending records saved to database`);
    } catch (error) {
      console.error(`Error flushing buffer on shutdown:`, error.message);
    }
  }

  console.log('Worker shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
