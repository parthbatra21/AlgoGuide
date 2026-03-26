import React from 'react';

export default function TopicModal({ open, topic, onClose, onAskMentor }) {
  if (!open || !topic) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl bg-gray-900 text-white rounded-xl border border-gray-700 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h4 className="text-lg font-semibold">{topic.title}</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="p-4 space-y-4">
          {topic.description && <p className="text-gray-300">{topic.description}</p>}
          {Array.isArray(topic.resources) && topic.resources.length > 0 && (
            <div>
              <p className="font-semibold mb-2">Resources</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                {topic.resources.map((url, i) => (
                  <li key={i}><a className="text-indigo-300 hover:underline" href={url} target="_blank" rel="noreferrer">{url}</a></li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(topic.tests) && topic.tests.length > 0 && (
            <div>
              <p className="font-semibold mb-2">Tests</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                {topic.tests.map((url, i) => (
                  <li key={i}><a className="text-emerald-300 hover:underline" href={url} target="_blank" rel="noreferrer">{url}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-800 flex items-center justify-end gap-3">
          <button onClick={() => onAskMentor?.(topic)} className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700">Ask AI Mentor</button>
          <button onClick={onClose} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600">Close</button>
        </div>
      </div>
    </div>
  );
}


