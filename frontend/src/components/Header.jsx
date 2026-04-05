import React from 'react';

export default function Header({ apiOnline, sensorStatus, selectedSensor }) {
  const statusLabel = apiOnline
    ? sensorStatus === 'offline'
      ? 'API ONLINE | SENSOR OFFLINE'
      : 'SYSTEM ONLINE'
    : 'API OFFLINE';

  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Unbox Robotics</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Fleet Speedometer
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-slate-600">
          Real-time speed monitoring for sensor-1 with queue-based architecture.
        </p>
      </div>
      <div
        className={`inline-flex flex-wrap items-center gap-2 rounded-full border px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-wider shadow-soft sm:flex-nowrap ${
          apiOnline && sensorStatus !== 'offline'
            ? 'border-slate-200 bg-slate-50 text-slate-600'
            : sensorStatus === 'offline'
              ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
              : 'border-red-200 bg-red-50 text-red-800'
        }`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            apiOnline && sensorStatus !== 'offline'
              ? 'bg-primary shadow-[0_0_0_3px_rgba(0,163,177,0.2)]'
              : sensorStatus === 'offline'
                ? 'bg-yellow-500'
                : 'bg-red-600'
          }`}
        />
        <span>{statusLabel}</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-900">
          {sensorStatus === 'offline' ? '⚠️ SENSOR OFFLINE' : `SENSOR: ${selectedSensor}`}
        </span>
      </div>
    </header>
  );
}
