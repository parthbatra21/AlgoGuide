import React from 'react';

export default function HeaderOverview({
  goal,
  weeksTotal,
  currentWeek,
  progressPct,
  studyHours,
  tip,
  onRegenerate,
}) {
  return (
    <div className="rounded-2xl p-6 md:p-8 text-white bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-400 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">{goal}</h2>
          <p className="opacity-90 mt-1">Week {currentWeek} of {weeksTotal}</p>
        </div>
        <button onClick={onRegenerate} className="bg-white/20 hover:bg-white/30 transition px-4 py-2 rounded-lg font-semibold">
          Regenerate Roadmap
        </button>
      </div>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-sm opacity-90 mb-2">Overall Progress</p>
          <div className="h-3 bg-white/30 rounded-full">
            <div className="h-3 bg-white rounded-full" style={{ width: `${progressPct}%` }}></div>
          </div>
          <p className="text-sm mt-1">{progressPct}%</p>
        </div>
        <div>
          <p className="text-sm opacity-90">Study Hours / week</p>
          <p className="text-xl font-semibold">{studyHours ?? '-'} hrs</p>
        </div>
        <div>
          <p className="text-sm opacity-90">AI Mentor Tip</p>
          <p className="text-sm md:text-base mt-1">{tip || 'Stay consistent. Small progress daily beats sporadic bursts.'}</p>
        </div>
      </div>
    </div>
  );
}


