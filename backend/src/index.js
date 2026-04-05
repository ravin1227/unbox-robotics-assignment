import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';
import speedRoutes from './api/speedRoutes.js';
import { initDB } from './db/db.js';
import { startStatusCheck, stopStatusCheck } from './utils/sensorStatus.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT;

// Middleware
app.use(express.json());

// Initialize database
await initDB();

// Start sensor status checker
startStatusCheck((event) => {
  console.log(`⚠️  Sensor Event:`, event);
  io.emit('sensor:status', {
    sensorId: event.sensorId,
    status: 'offline',
    lastUpdate: event.lastUpdate,
    offlineFor: event.offlineFor,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/speed', speedRoutes(io));

// WebSocket Events
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });

  socket.on('history:request', (data) => {
    console.log(`📊 History request from ${socket.id}:`, data);
    // Emit historical data (placeholder)
    socket.emit('history:data', { message: 'Historical data not yet implemented' });
  });

  socket.on('error', (error) => {
    console.error(`❌ Socket error: ${error}`);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Centralized error handling (must be last)
app.use(errorHandler);

server.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🚀 BACKEND SERVER STARTED');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`🌐 API Server: http://localhost:${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  console.log(`🎯 POST /api/speed - Receive sensor data`);
  console.log(`❤️  GET /health - Health check`);
  console.log('═══════════════════════════════════════════════════════\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  stopStatusCheck();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export { io };
