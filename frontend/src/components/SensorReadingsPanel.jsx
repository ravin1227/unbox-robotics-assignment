import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const LOG_PX = 'h-[200px] sm:h-[220px]';
const STICK_BOTTOM_PX = 12;

function resolveFocusSensor(sensorData, selectedSensor) {
  const keys = Object.keys(sensorData).sort();
  if (keys.length === 0) return null;
  if (selectedSensor && sensorData[selectedSensor]) return selectedSensor;
  let best = keys[0];
  let bestV = sensorData[best]?.speed ?? 0;
  keys.forEach((k) => {
    const v = sensorData[k]?.speed ?? 0;
    if (v > bestV) {
      bestV = v;
      best = k;
    }
  });
  return best;
}

/**
 * Samples the focused channel every second (selected tab, or fleet-fastest when "All" is active).
 */
export default function SensorReadingsPanel({ sensorData = {}, selectedSensor = null }) {
  const dataRef = useRef(sensorData);
  const selectedRef = useRef(selectedSensor);
  const logRef = useRef(null);
  /** If true, keep scroll pinned to bottom when new samples arrive (chronological log). */
  const stickBottomRef = useRef(true);

  dataRef.current = sensorData;
  selectedRef.current = selectedSensor;

  const [history, setHistory] = useState(() => []);

  useEffect(() => {
    setHistory([]);
    stickBottomRef.current = true;
  }, [selectedSensor]);

  useLayoutEffect(() => {
    const el = logRef.current;
    if (!el || history.length === 0) return;
    if (stickBottomRef.current) {
      el.scrollTop = el.scrollHeight - el.clientHeight;
    }
  }, [history]);

  const focusId = useMemo(
    () => resolveFocusSensor(sensorData, selectedSensor),
    [sensorData, selectedSensor],
  );

  // Track previous speed to only log changes
  const prevSpeedRef = useRef(null);

  useEffect(() => {
    const sample = () => {
      const d = dataRef.current;
      const id = resolveFocusSensor(d, selectedRef.current);
      if (!id || d[id] == null) return;
      const speed = d[id]?.speed ?? 0;

      // Only add to log if speed actually changed
      if (prevSpeedRef.current !== speed) {
        prevSpeedRef.current = speed;
        setHistory((prev) => [...prev, { t: Date.now(), id, speed }].slice(-48));
      }
    };

    const t0 = setTimeout(sample, 80);
    const id = setInterval(sample, 1000);
    return () => {
      clearTimeout(t0);
      clearInterval(id);
    };
  }, []);

  const formatRowTime = (t) =>
    new Date(t).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const v = focusId ? sensorData[focusId]?.speed ?? 0 : 0;
  const pct = Math.min(100, (v / 120) * 100);

  const onLogScroll = () => {
    const el = logRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_BOTTOM_PX;
    stickBottomRef.current = nearBottom;
  };

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm sm:p-4">
      <div className="mb-1">
        <h3 className="font-display text-sm font-semibold text-slate-900">Live readings</h3>
      </div>

      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">Current</p>
        <p className="mt-1 text-xs text-slate-500">
          Selected tab: <span className="font-medium text-slate-800">{selectedSensor ?? '—'}</span>
        </p>
        <ul className="mt-2" aria-live="polite">
          {!focusId ? (
            <li className="text-sm text-slate-500">Waiting for telemetry…</li>
          ) : (
            <li className="min-w-0">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium text-slate-800">{focusId}</span>
                <span className="shrink-0 tabular-nums text-base font-semibold text-slate-900">
                  {v.toFixed(1)}
                  <span className="ml-1 text-xs font-normal text-slate-500">km/h</span>
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/80" aria-hidden>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-light to-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )}
        </ul>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
          Per-second log ({selectedSensor || 'focus'})
        </p>
        <ul
          ref={logRef}
          onScroll={onLogScroll}
          className={`mt-1.5 ${LOG_PX} shrink-0 space-y-0 overflow-y-scroll overscroll-y-contain rounded-xl border border-slate-100 bg-white text-xs [scrollbar-gutter:stable] scrollbar-thin-stable`}
          aria-label="Recent speed samples for focused channel"
        >
          {history.length === 0 ? (
            <li className="px-3 py-4 text-center text-slate-500">Samples appear after the first tick.</li>
          ) : (
            history.map((row) => (
              <li
                key={row.t}
                className="flex items-baseline gap-3 border-b border-slate-50 px-2.5 py-2 last:border-b-0"
              >
                <time className="w-[4.75rem] shrink-0 tabular-nums text-slate-400">{formatRowTime(row.t)}</time>
                <span className="flex min-w-0 flex-1 items-baseline gap-4 sm:gap-5">
                  <span className="shrink-0 text-slate-500">{row.id}</span>
                  <span className="min-w-0 font-semibold tabular-nums text-slate-900">
                    {row.speed.toFixed(1)} km/h
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </aside>
  );
}
