import React from 'react';

const TONE_DOT = {
  green: 'bg-green-500',
  purple: 'bg-violet-600',
  red: 'bg-red-600',
  neutral: 'bg-slate-400',
};

function SystemEvents({ events = [], sensors = {} }) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3.5 font-display text-base font-semibold text-slate-900">System events</h2>

      <ul className="max-h-72 flex-1 list-none space-y-0 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <li className="py-8 text-sm text-slate-500">Waiting for telemetry…</li>
        ) : (
          events.map((ev) => (
            <li
              key={ev.id}
              className="flex gap-3 border-b border-slate-100 py-3 last:border-b-0"
            >
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[ev.tone] || TONE_DOT.neutral}`}
              />
              <div className="min-w-0">
                <p className="text-[0.82rem] font-semibold leading-snug text-slate-900">{ev.title}</p>
                <p className="mt-1 text-[0.72rem] text-slate-500">
                  {ev.time} — {ev.source}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
          Active channels
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(sensors).length === 0 ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-medium text-slate-500">
              No sensors
            </span>
          ) : (
            Object.keys(sensors).map((id) => (
              <span
                key={id}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-medium text-slate-800"
              >
                {id}
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default SystemEvents;
