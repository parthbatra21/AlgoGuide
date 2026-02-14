import React from 'react';

export default function AiMentorButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 rounded-full px-5 py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold shadow-lg"
    >
      Ask AI Mentor
    </button>
  );
}


