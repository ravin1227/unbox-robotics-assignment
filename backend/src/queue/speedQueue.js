import { Queue, Worker } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
};

// Speed data queue
export const speedQueue = new Queue('speed-data', { connection: redisConnection });

// Queue event handlers
speedQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

speedQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

speedQueue.on('error', (error) => {
  console.error('Queue error:', error.message);
});

// Process speed data jobs with full record data
export async function processSpeedQueue(callback) {
  // Create worker with concurrency (number of parallel jobs)
  const worker = new Worker('speed-data', async (job) => {
    const { id, sensorId, speed, timestamp } = job.data;

    try {
      // Execute callback (usually database insert)
      await callback(id, sensorId, speed, timestamp);
      return { success: true, id, sensorId, speed };
    } catch (error) {
      console.error(`Error processing job ${id} for sensor ${sensorId}:`, error.message);
      throw error; // Retry on failure
    }
  }, {
    connection: redisConnection,
    concurrency: 5, // Process 5 jobs in parallel
  });

  // Worker event handlers - only log failures
  worker.on('failed', (job, err) => {
    console.error(`Worker: Job ${job.id} failed - ${err.message}`);
  });
}

// Add job to queue with full record data
export async function addSpeedJob(id, sensorId, speed, timestamp) {
  try {
    const job = await speedQueue.add(
      'speed-data',
      {
        id,
        sensorId,
        speed,
        timestamp,
      },
      {
        attempts: 3, // Retry 3 times
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
    return job;
  } catch (error) {
    console.error('Error adding job to queue:', error.message);
    throw error;
  }
}

// Get queue stats
export async function getQueueStats() {
  try {
    const [waitingCount, activeCount, completedCount, failedCount] = await Promise.all([
      speedQueue.getWaitingCount(),
      speedQueue.getActiveCount(),
      speedQueue.getCompletedCount(),
      speedQueue.getFailedCount(),
    ]);

    return {
      waiting: waitingCount,
      active: activeCount,
      completed: completedCount,
      failed: failedCount,
    };
  } catch (error) {
    console.error('Error fetching queue stats:', error.message);
    return null;
  }
}
