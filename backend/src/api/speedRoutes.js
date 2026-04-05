import express from 'express';
import { addSpeedJob } from '../queue/speedQueue.js';
import { updateSensorActivity } from '../utils/sensorStatus.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export default function speedRoutes(io) {
  const router = express.Router();

  // POST /api/speed - Ingest speed data
  router.post('/', asyncHandler(async (req, res) => {
    const { id, sensorId, speed, timestamp } = req.body;

    // Step 1: Validate required fields
    if (!sensorId || speed === undefined || !timestamp) {
      throw new AppError('Missing required fields: sensorId, speed, timestamp', 400);
    }

    // Step 2: Validate data types
    if (typeof speed !== 'number' || typeof sensorId !== 'string') {
      throw new AppError('Invalid data types: speed must be number, sensorId must be string', 400);
    }

    // Step 3: Validate speed range (0-120 km/h)
    if (speed < 0 || speed > 120) {
      throw new AppError('Invalid speed: must be between 0 and 120 km/h', 400);
    }

    // Step 4: Log the incoming record
    console.log(`\n📥 [${new Date().toISOString()}] Received record:`, {
      id,
      sensorId,
      speed: parseFloat(speed.toFixed(2)),
      timestamp,
    });

    const normalizedSpeed = parseFloat(speed.toFixed(2));

    // Step 5: Broadcast to all connected WebSocket clients (instant update)
    io.emit('speed:update', {
      id,
      sensorId,
      speed: normalizedSpeed,
      timestamp,
    });
    console.log(`WebSocket: Broadcasted to all clients`);

    // Step 6: Track sensor activity (for offline detection)
    const statusChange = updateSensorActivity(sensorId);
    if (statusChange) {
      console.log(`Sensor Status: ${sensorId} came back ONLINE`);
      io.emit('sensor:status', {
        sensorId,
        status: 'online',
        timestamp: new Date().toISOString(),
      });
    }

    // Step 7: Add to queue for async database processing
    await addSpeedJob(id, sensorId, normalizedSpeed, timestamp);
    console.log(`Queue: Queued for database write\n`);

    res.status(202).json({
      success: true,
      message: 'Speed data received and queued',
      data: {
        id,
        sensorId,
        speed: normalizedSpeed,
        timestamp,
        queued: true,
      },
    });
  }));

  return router;
}
