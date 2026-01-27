import React from 'react';

export default function TopicCard({ topic, completed, onToggle, onOpen }) {
  return (
    <div className={`p-4 rounded-lg border ${completed ? 'border-green-500 bg-green-500/10' : 'border-gray-700 bg-gray-700/40'} hover:bg-gray-600/40 transition`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h4 className="font-semibold">{topic.title}</h4>
          {topic.description && (
            <p className="text-sm text-gray-300 mt-1">{topic.description}</p>
          )}
          {Array.isArray(topic.resources) && topic.resources.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {topic.resources.slice(0, 3).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded bg-gray-600 hover:bg-gray-500">
                  Resource {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onOpen(topic)} className="text-xs px-2 py-1 rounded bg-gray-600 hover:bg-gray-500">Details</button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={completed} onChange={() => onToggle(topic.id)} />
            Done
          </label>
        </div>
      </div>
    </div>
  );
}


