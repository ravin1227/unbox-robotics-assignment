import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL;
const INTERVAL = process.env.INTERVAL;
const BACKEND_PORT = process.env.BACKEND_PORT;

// Single sensor
const SENSOR_ID = 'sensor-1';

// Speed variance for realistic simulation
let speedState = 0;
let recordId = 0;

// Generate realistic speed data
function generateSpeed() {
  let currentSpeed = speedState;

  // Random acceleration/deceleration (-15 to +15 for more dynamic motion)
  const change = (Math.random() - 0.5) * 30;
  currentSpeed = Math.max(0, Math.min(120, currentSpeed + change));

  // This allows the speed to reach higher values
  currentSpeed = currentSpeed * 0.85 + speedState * 0.15;

  speedState = currentSpeed;
  return parseFloat(currentSpeed.toFixed(2));
}

// Create record with id, timestamp, speed
function createRecord(speed) {
  recordId += 1;
  return {
    id: recordId,
    sensorId: SENSOR_ID,
    speed,
    timestamp: new Date().toISOString(),
  };
}

// Send speed data to API
async function sendSpeedData(record) {
  try {
    // Console log the record being sent
    console.log('📤 Sending record:', JSON.stringify(record, null, 2));

    const response = await axios.post(API_URL, record);

    console.log(`✅ [${record.sensorId}] Record #${record.id} sent successfully - Status: ${response.status}\n`);
  } catch (error) {
    console.error(`❌ [${SENSOR_ID}] Error sending record #${record.id}:`, error.message, '\n');
  }
}

// Start simulation
async function startSimulation() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 SENSOR SIMULATOR STARTED');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📡 Backend API URL: http://localhost:${BACKEND_PORT}/api/speed`);
  console.log(`🎯 Sensor ID: ${SENSOR_ID}`);
  console.log(`⏱️  Send Interval: ${INTERVAL}ms (every ${INTERVAL / 1000} second)`);
  console.log(`📊 Data Fields: id, sensorId, speed (km/h), timestamp (ISO)`);
  console.log('═══════════════════════════════════════════════════════\n');

  setInterval(async () => {
    const speed = generateSpeed();
    const record = createRecord(speed);
    await sendSpeedData(record);
  }, INTERVAL);
}

startSimulation();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🛑 SHUTTING DOWN SENSOR SIMULATOR');
  console.log(`📊 Total records sent: ${recordId}`);
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
});
