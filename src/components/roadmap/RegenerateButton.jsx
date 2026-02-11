import React from 'react';

export default function RegenerateButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-3 py-2 rounded bg-white/15 hover:bg-white/25 disabled:opacity-50"
    >
      {loading ? 'Regenerating...' : 'Regenerate'}
    </button>
  );
}


