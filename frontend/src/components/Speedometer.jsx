import React, { useMemo, useId } from 'react';

const MAX_KMH = 120;
const R = 88;
const STROKE = 10;
const ARC_FRACTION = 270 / 360;

/** Arc from 135° → 45° clockwise (gap at bottom); θ in degrees from +x, CCW math. */
function velocityArcPath(cx, cy, r) {
  const r135 = (135 * Math.PI) / 180;
  const r45 = (45 * Math.PI) / 180;
  const x1 = cx + r * Math.cos(r135);
  const y1 = cy + r * Math.sin(r135);
  const x2 = cx + r * Math.cos(r45);
  const y2 = cy + r * Math.sin(r45);
  return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
}

/** Speed 0..MAX → angle in radians from +x (same convention as arc endpoints). */
function speedToAngleRad(speed) {
  const frac = Math.min(Math.max(speed / MAX_KMH, 0), 1);
  const deg = 135 + frac * 270;
  return (deg * Math.PI) / 180;
}

function tickMark(cx, cy, angleRad, len, innerR) {
  const ox = cx + innerR * Math.cos(angleRad);
  const oy = cy + innerR * Math.sin(angleRad);
  const ix = cx + (innerR - len) * Math.cos(angleRad);
  const iy = cy + (innerR - len) * Math.sin(angleRad);
  return { x1: ix, y1: iy, x2: ox, y2: oy };
}

function labelAt(cx, cy, angleRad, rLabel, text) {
  const x = cx + rLabel * Math.cos(angleRad);
  const y = cy + rLabel * Math.sin(angleRad);
  return { x, y, text };
}

const TICKS = [0, 30, 60, 90, 120];

function Speedometer({ speed = 0, sensorId = 'sensor-1', connectionStatus = 'disconnected' }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `arcGrad-${uid}`;
  const shadowId = `needleShadow-${uid}`;

  const normalized = Math.min(Math.max(Number(speed) || 0, 0), MAX_KMH);
  const arcLen = 2 * Math.PI * R * ARC_FRACTION;
  const progressLen = (normalized / MAX_KMH) * arcLen;

  const displayNode = sensorId === 'ALL' ? 'AGGREGATE' : sensorId.toUpperCase().replace(/-/g, '‑');

  const formatted = useMemo(() => {
    const n = normalized;
    if (n >= 100) return Math.round(n).toLocaleString();
    return n.toFixed(1).replace(/\.0$/, '');
  }, [normalized]);

  const arcPath = velocityArcPath(100, 100, R);
  const needleAngle = speedToAngleRad(normalized);
  const nLen = 58;
  const nx = 100 + nLen * Math.cos(needleAngle);
  const ny = 100 + nLen * Math.sin(needleAngle);

  const showReading = connectionStatus === 'connected' || normalized > 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex w-full max-w-[400px] flex-col items-center"
        role="img"
        aria-label={
          showReading
            ? `Speed ${formatted} kilometers per hour, maximum ${MAX_KMH}`
            : 'Speedometer, no reading'
        }
      >
        {/* Gauge only — readout sits below so the needle never crosses digits */}
        <div className="w-full shrink-0 overflow-visible [&_svg]:mx-auto [&_svg]:block [&_svg]:max-h-[min(50vw,240px)] [&_svg]:w-full [&_svg]:max-w-[360px]">
          {/* Extra top padding (ymin −36) so the “60” label above the arc isn’t clipped */}
          <svg viewBox="0 -44 200 248" preserveAspectRatio="xMidYMid meet" overflow="visible" aria-hidden>
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00c9d3" />
                <stop offset="100%" stopColor="#00a3b1" />
              </linearGradient>
              <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.12" />
              </filter>
            </defs>

            {TICKS.map((km) => {
              const rad = speedToAngleRad(km);
              const major = km % 30 === 0;
              const { x1, y1, x2, y2 } = tickMark(100, 100, rad, major ? 10 : 5, R + STROKE / 2 + 2);
              const lbl = major ? labelAt(100, 100, rad, R + 26, String(km)) : null;
              return (
                <g key={km}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={major ? '#94a3b8' : '#cbd5e1'}
                    strokeWidth={major ? 1.5 : 1}
                    strokeLinecap="round"
                  />
                  {lbl && (
                    <text
                      x={lbl.x}
                      y={lbl.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-slate-500"
                      style={{ fontSize: '9px', fontWeight: 600 }}
                    >
                      {lbl.text}
                    </text>
                  )}
                </g>
              );
            })}

            <path
              className="fill-none stroke-slate-200"
              d={arcPath}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
            <path
              className="fill-none motion-safe:transition-[stroke-dasharray] motion-safe:duration-300 motion-safe:ease-out"
              d={arcPath}
              stroke={`url(#${gradId})`}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${progressLen} ${arcLen}`}
              filter={`url(#${shadowId})`}
            />

            <line
              x1={100}
              y1={100}
              x2={nx}
              y2={ny}
              stroke="#1e293b"
              strokeWidth={2.5}
              strokeLinecap="round"
              filter={`url(#${shadowId})`}
            />
            <circle cx={100} cy={100} r={8} fill="#fff" stroke="#e2e8f0" strokeWidth={2} />
            <circle cx={100} cy={100} r={4} fill="#00a3b1" />
          </svg>
        </div>

        <div className="mt-4 flex w-full max-w-[340px] flex-col items-center border-t border-slate-100 px-3 pt-4 text-center">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400">Velocity</p>
          <p
            className="mt-2 font-display text-4xl font-bold leading-none tracking-tight text-slate-900 motion-safe:transition-opacity motion-safe:duration-200 sm:mt-2.5 sm:text-[2.75rem] sm:leading-none"
            aria-live="polite"
          >
            {showReading ? formatted : '—'}
          </p>
          <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-widest text-primary">km/h</p>
        </div>
      </div>

      <p className="text-center text-sm text-slate-600">
        <span className="text-slate-500">Live stream</span>
        {' · '}
        <strong className="font-semibold text-slate-900">{displayNode}</strong>
      </p>
    </div>
  );
}

export default Speedometer;
