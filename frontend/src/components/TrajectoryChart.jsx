import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceDot,
} from 'recharts';

const HALF_HOUR_MS = 30 * 60 * 1000;
/** One chart point per bucket — smooths sub-second / multi-sensor spam */
const BUCKET_MS = 30 * 1000;

function formatAxisTime(ms, spanMs) {
  const opts = { hour: '2-digit', minute: '2-digit', hour12: false };
  if (spanMs < 8 * 60 * 1000) opts.second = '2-digit';
  return new Date(ms).toLocaleTimeString([], opts);
}

/** Tooltip / detail: always show seconds when the visible window is short. */
function formatDetailTime(ms, spanMs) {
  const opts = { hour: '2-digit', minute: '2-digit', hour12: false };
  if (spanMs < 15 * 60 * 1000) opts.second = '2-digit';
  return new Date(ms).toLocaleTimeString([], opts);
}

/** Few, evenly spaced ticks across the domain so labels are not duplicated every 30s bucket. */
function buildTimeTicks(tMin, tMax, maxTicks = 6) {
  if (!Number.isFinite(tMin) || !Number.isFinite(tMax)) return [];
  if (tMax < tMin) return buildTimeTicks(tMax, tMin, maxTicks);
  if (tMax - tMin < 2) return [tMin];
  const n = Math.min(maxTicks, Math.max(2, maxTicks));
  const step = (tMax - tMin) / (n - 1);
  const raw = Array.from({ length: n }, (_, i) => Math.round(tMin + step * i));
  return [...new Set(raw)].sort((a, b) => a - b);
}

function ChartTooltip({ active, payload, label, coordinate, viewBox, spanMs }) {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.value;
  const speed = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isNaN(speed)) return null;
  const tMs = label != null ? Number(label) : NaN;
  const span = typeof spanMs === 'number' && spanMs > 0 ? spanMs : HALF_HOUR_MS;
  const timeStr = Number.isFinite(tMs) ? formatDetailTime(tMs, span) : '—';

  let nudgeX = 0;
  if (coordinate && viewBox && typeof viewBox.x === 'number') {
    const edge = viewBox.x + 64;
    if (coordinate.x < edge) nudgeX = Math.min(72, edge - coordinate.x + 8);
  }

  return (
    <div
      className="min-w-[9.5rem] rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-lg shadow-slate-900/10"
      style={{ transform: nudgeX ? `translateX(${nudgeX}px)` : undefined }}
    >
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Time</p>
      <p className="mt-0.5 tabular-nums text-sm font-semibold text-slate-900">{timeStr}</p>
      <p className="mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Speed</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-primary">{speed.toFixed(1)} km/h</p>
    </div>
  );
}

/**
 * Last 30 minutes only, aggregated into ~30s buckets (max ~60 points).
 * Fleet (no sensor): max speed in bucket. Single sensor: mean speed in bucket.
 */
function windowedBucketSeries(history, selectedSensor, nowMs) {
  const cutoff = nowMs - HALF_HOUR_MS;
  let rows = history.filter((h) => h.t >= cutoff);
  if (selectedSensor) {
    rows = rows.filter((h) => h.sensorId === selectedSensor);
  }

  if (rows.length === 0) return [];

  const byBucket = new Map();
  for (const h of rows) {
    const start = Math.floor(h.t / BUCKET_MS) * BUCKET_MS;
    if (!byBucket.has(start)) {
      byBucket.set(start, { speeds: [], t: start });
    }
    byBucket.get(start).speeds.push(h.speed);
  }

  const merged = [...byBucket.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, { speeds, t }]) => {
      const speed = selectedSensor
        ? speeds.reduce((s, x) => s + x, 0) / speeds.length
        : Math.max(...speeds);
      const spanHint = HALF_HOUR_MS;
      return {
        t,
        speed: Number(speed.toFixed(2)),
        timeLabel: formatAxisTime(t, spanHint),
      };
    });

  return merged.map((p, index) => ({ ...p, index }));
}

function TrajectoryChart({ history = [], selectedSensor = null }) {
  const [windowNow, setWindowNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setWindowNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const base = useMemo(
    () => windowedBucketSeries(history, selectedSensor, windowNow),
    [history, selectedSensor, windowNow],
  );

  const peakIndex = useMemo(() => {
    if (!base.length) return -1;
    let maxI = 0;
    let maxV = -1;
    base.forEach((d, i) => {
      if (d.speed > maxV) {
        maxV = d.speed;
        maxI = i;
      }
    });
    return maxI;
  }, [base]);

  const { xTicks, xSpan } = useMemo(() => {
    if (!base.length) return { xTicks: undefined, xSpan: HALF_HOUR_MS };
    const tMin = base[0].t;
    const tMax = base[base.length - 1].t;
    const span = Math.max(1, tMax - tMin);
    return { xTicks: buildTimeTicks(tMin, tMax, 6), xSpan: span };
  }, [base]);

  const axisId = selectedSensor || 'ALL';
  const subtitle =
    axisId === 'ALL'
      ? 'Fleet velocity · last 30 min (~30 s bins)'
      : `${axisId.replace(/-/g, ' / ')} · last 30 min (~30 s bins)`;

  const toggleBtn = (active) =>
    `rounded-full px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 ${
      active ? 'bg-white text-primary shadow-soft' : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <section className="relative min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <header className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-slate-900">Trajectory projection</h2>
          <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {subtitle}
          </p>
        </div>
        <div className="inline-flex shrink-0 rounded-full bg-slate-100 p-0.5" role="tablist" aria-label="Chart mode">
          <span
            role="tab"
            aria-selected="true"
            aria-current="true"
            className={toggleBtn(true)}
          >
            Live
          </span>
          <span
            role="tab"
            aria-selected="false"
            aria-disabled="true"
            title="Coming soon — trajectory projection is not enabled for this deployment."
            className="rounded-full px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-slate-400 opacity-80 cursor-not-allowed select-none"
          >
            Predicted
          </span>
        </div>
      </header>

      <div className="min-h-[260px]">
        {base.length === 0 ? (
          <div className="flex h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center">
            <p className="text-sm font-medium text-slate-600">No trajectory samples yet</p>
            <p className="max-w-sm text-xs text-slate-500">
              Streams build up to 30 minutes of history (~30s samples).
            </p>
          </div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={base}
                margin={{ top: 10, right: 10, left: 2, bottom: 6 }}
              >
                <CartesianGrid strokeDasharray="3 6" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  type="number"
                  dataKey="t"
                  domain={['dataMin', 'dataMax']}
                  ticks={xTicks}
                  tickFormatter={(ms) => formatAxisTime(ms, xSpan)}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  padding={{ left: 16, right: 16 }}
                  minTickGap={24}
                  height={32}
                />
                <YAxis
                  domain={[0, 120]}
                  width={36}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                />
                <Tooltip
                  content={(props) => <ChartTooltip {...props} spanMs={xSpan} />}
                  allowEscapeViewBox={{ x: true, y: true }}
                  offset={14}
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                  wrapperStyle={{ outline: 'none' }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke="#00a3b1"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#00a3b1' }}
                />
                {peakIndex >= 0 && base[peakIndex] && (
                  <ReferenceDot
                    x={base[peakIndex].t}
                    y={base[peakIndex].speed}
                    r={5}
                    fill="#7c5cbf"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 rounded-sm bg-primary" />
            Primary vector
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
            Peak
          </span>
        </div>
      </div>
    </section>
  );
}

export default TrajectoryChart;
