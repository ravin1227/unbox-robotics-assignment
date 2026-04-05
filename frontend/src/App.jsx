import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import Header from './components/Header';
import Speedometer from './components/Speedometer';
import SensorReadingsPanel from './components/SensorReadingsPanel';
import SystemEvents from './components/SystemEvents';
import TrajectoryChart from './components/TrajectoryChart';

function newEventId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatTime(d) {
  return d.toLocaleTimeString([], { hour12: false });
}

const SELECTED_SENSOR = 'sensor-1';

export default function App() {
  const ws = useWebSocket();
  const [events, setEvents] = useState([]);

  const pushEvent = useCallback((title, source, tone = 'neutral') => {
    setEvents((prev) => {
      const row = {
        id: newEventId(),
        title,
        source,
        tone,
        time: formatTime(new Date()),
      };
      return [row, ...prev].slice(0, 12);
    });
  }, []);

  // Connection status tracking
  const connectionTrackedRef = useRef(false);
  useEffect(() => {
    if (ws.connectionStatus === 'connected' && !connectionTrackedRef.current) {
      connectionTrackedRef.current = true;
      pushEvent('Connected to API', 'SYSTEM', 'green');
    } else if (ws.connectionStatus !== 'connected' && connectionTrackedRef.current) {
      connectionTrackedRef.current = false;
      pushEvent('Disconnected from API', 'SYSTEM', 'red');
    }
  }, [ws.connectionStatus, pushEvent]);

  // Sensor offline detection
  const sensorTimeoutRef = useRef({});
  useEffect(() => {
    if (!ws.socket) return;

    // Listen for sensor status events from backend
    ws.socket.on('sensor:status', (event) => {
      if (event.status === 'offline') {
        pushEvent(`${event.sensorId} went offline`, 'ALERT', 'red');
        sensorTimeoutRef.current[event.sensorId] = 'offline';
      } else if (event.status === 'online') {
        pushEvent(`${event.sensorId} came back online`, 'SENSOR', 'green');
        sensorTimeoutRef.current[event.sensorId] = 'online';
      }
    });

    return () => {
      ws.socket?.off('sensor:status');
    };
  }, [ws.socket, pushEvent]);

  // Speed change tracking
  const prevSpeedRef = useRef({});
  useEffect(() => {
    const sensors = Object.values(ws.sensorData);
    if (sensors.length === 0) return;

    sensors.forEach((s) => {
      const prev = prevSpeedRef.current[s.sensorId];
      const prevSpeed = prev?.speed;

      prevSpeedRef.current[s.sensorId] = {
        speed: s.speed,
        timestamp: s.timestamp,
      };

      if (prevSpeed === undefined) {
        pushEvent(`${s.sensorId} online at ${s.speed.toFixed(1)} km/h`, 'SENSOR', 'blue');
      } else if (s.speed >= 90 && prevSpeed < 90) {
        pushEvent(`${s.sensorId} exceeded 90 km/h`, 'ALERT', 'red');
      }
    });
  }, [ws.sensorData, pushEvent]);

  const selectedSensor = SELECTED_SENSOR;

  // Track sensor status separately from API connection
  const [sensorStatus, setSensorStatus] = useState('unknown');

  useEffect(() => {
    if (!ws.socket) return;

    ws.socket.on('sensor:status', (event) => {
      setSensorStatus(event.status);
    });

    return () => {
      ws.socket?.off('sensor:status');
    };
  }, [ws.socket]);

  const displaySpeed = useMemo(() => {
    const v = ws.sensorData[selectedSensor]?.speed;
    return typeof v === 'number' ? v : 0;
  }, [selectedSensor, ws.sensorData]);

  const historyForChart = useMemo(
    () => ws.speedHistory.filter((h) => h.sensorId === selectedSensor),
    [ws.speedHistory, selectedSensor],
  );

  const apiOnline = ws.connectionStatus === 'connected';

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 bg-[length:16px_16px] bg-fixed px-4 py-6 [background-image:radial-gradient(rgba(0,0,0,0.035)_1px,transparent_1px)] sm:px-6 lg:px-8 lg:py-10">
      <div className="flex-1 rounded-2xl border border-slate-200/90 bg-white shadow-card">
        <div className="p-5 sm:p-7 md:p-8">
          <Header
            apiOnline={apiOnline}
            sensorStatus={sensorStatus}
            selectedSensor={selectedSensor}
          />

          <section className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-white px-4 py-4 sm:px-6 sm:py-5 lg:px-7">
            <h2 className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-slate-500 lg:mb-5">
              Current Speed
            </h2>
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-8 xl:gap-9">
              <div className="flex min-h-[220px] w-full min-w-0 flex-col items-center justify-center lg:min-h-0">
                <Speedometer
                  speed={displaySpeed}
                  sensorId={selectedSensor}
                  connectionStatus={ws.connectionStatus}
                />
              </div>
              <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
                <SensorReadingsPanel
                  sensorData={ws.sensorData}
                  selectedSensor={selectedSensor}
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <SystemEvents events={events} sensors={ws.sensorData} />
            <TrajectoryChart
              history={historyForChart}
              selectedSensor={selectedSensor}
            />
          </section>
        </div>
      </div>

      <footer className="px-2 pb-4 text-center text-sm text-slate-500">
        Unbox robotics © 2026 · Real-time speedometer
      </footer>
    </div>
  );
}
