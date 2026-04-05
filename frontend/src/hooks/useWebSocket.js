import { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL;
/** Allow ~30+ min of raw points for trajectory downsampling (chart buckets separately). */
const MAX_HISTORY = 8000;

export const useWebSocket = () => {
  const [socket, setSocket] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [sensorData, setSensorData] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [speedHistory, setSpeedHistory] = useState([]);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setConnectionStatus('disconnected');
    });

    newSocket.on('speed:update', (data) => {
      const { sensorId, speed, timestamp } = data;

      setCurrentSpeed(speed);

      setSensorData((prev) => {
        const prevData = prev[sensorId];
        const speedChanged = !prevData || prevData.speed !== speed;

        return {
          ...prev,
          [sensorId]: {
            sensorId,
            speed,
            timestamp,
            // Only update timestamp if speed actually changed
            updatedAt: speedChanged ? new Date().toISOString() : (prevData?.updatedAt || new Date().toISOString()),
          },
        };
      });

      // Always add to history (for trajectory chart)
      setSpeedHistory((prev) => {
        const next = [
          ...prev,
          {
            t: Date.now(),
            speed,
            sensorId,
          },
        ];
        return next.slice(-MAX_HISTORY);
      });
    });

    // Listen for sensor status changes (online/offline)
    newSocket.on('sensor:status', (data) => {
      console.log('Sensor Status Event:', data);
      // Let App.jsx handle the event
    });

    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const requestHistoricalData = useCallback((sensorId, limit = 100) => {
    if (socket) {
      socket.emit('history:request', { sensorId, limit });
    }
  }, [socket]);

  return {
    currentSpeed,
    sensorData,
    connectionStatus,
    speedHistory,
    requestHistoricalData,
    socket,
  };
};
