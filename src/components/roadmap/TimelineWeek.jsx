import React, { useState } from 'react';
import TopicCard from './TopicCard';

export default function TimelineWeek({ week, topics, progressMap, onToggle, onOpen }) {
  const [open, setOpen] = useState(true);
  const completed = topics.filter(t => progressMap[t.id]);
  const ratio = topics.length ? Math.round((completed.length / topics.length) * 100) : 0;

  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden">
      <button className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 flex items-center justify-between" onClick={() => setOpen(!open)}>
        <div>
          <h3 className="font-semibold">Week {week}</h3>
          <p className="text-sm text-gray-400">{completed.length}/{topics.length} • {ratio}%</p>
        </div>
        <span className="text-orange-400">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="p-4 space-y-3 bg-gray-800/60">
          {topics.map((t, idx) => (
            <TopicCard
              key={t.id || idx}
              topic={t}
              completed={!!progressMap[t.id]}
              onToggle={onToggle}
              onOpen={onOpen}
            />)
          )}
        </div>
      )}
    </div>
  );
}


