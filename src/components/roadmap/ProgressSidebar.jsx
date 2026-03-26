import React from 'react';

export default function ProgressSidebar({ completed, total, upcoming = [] }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <aside className="space-y-4">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-sm text-gray-400">Progress</p>
        <p className="text-xl font-bold">{completed} / {total}</p>
        <div className="h-2 bg-gray-700 rounded-full mt-2">
          <div className="h-2 bg-orange-500 rounded-full" style={{ width: `${pct}%` }}></div>
        </div>
      </div>
      {upcoming.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400 mb-2">Upcoming This Week</p>
          <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
            {upcoming.slice(0, 5).map((t, i) => (<li key={i}>{t.title || t}</li>))}
          </ul>
        </div>
      )}
    </aside>
  );
}


