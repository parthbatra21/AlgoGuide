import { useUser, UserButton, SignedIn } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AiMentorButton from '../components/roadmap/AiMentorButton';
import AiMentorModal from '../components/roadmap/AiMentorModal';

export default function Dashboard() {
  const { user } = useUser();
  const [roadmapData, setRoadmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({});
  const [notes, setNotes] = useState({});
  const [revisions, setRevisions] = useState({});
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState(null);
  const [mentorModalOpen, setMentorModalOpen] = useState(false);
  const navigate = useNavigate();
  const [openWeeks, setOpenWeeks] = useState({});

  useEffect(() => {
    let unsubscribe;
    (async () => {
      try {
        const authModule = await import(/* @vite-ignore */ 'firebase/auth').catch(() => null);
        if (!authModule) return;
        const { getAuth, onAuthStateChanged } = authModule;
        const auth = getAuth();
        unsubscribe = onAuthStateChanged(auth, (fbUser) => {
          if (fbUser?.uid) {
            console.log('Firebase UID (Dashboard):', fbUser.uid);
          }
        });
      } catch {
        // Firebase not configured/installed; skip logging
      }
    })();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return;
        
        const response = await fetch(`http://localhost:8000/home-by-email/${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Dashboard data received:', data);
          setRoadmapData(data);
        } else {
          console.error('Failed to fetch dashboard data:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch roadmap:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.primaryEmailAddress?.emailAddress) {
      fetchRoadmap();
    }
  }, [user]);

  // Build weeks from resources if weeks array doesn't exist in response
  const buildWeeksFromResources = (data) => {
    if (!data) return [];
    
    if (Array.isArray(data.weeks) && data.weeks.length > 0) {
      return data.weeks;
    }

    const allResources = [];
    
    if (data.resources) {
      Object.values(data.resources).forEach(category => {
        if (Array.isArray(category)) {
          allResources.push(...category);
        }
      });
    }

    if (allResources.length === 0) {
      return [];
    }

    const topicsPerWeek = 6;
    const weeks = [];
    
    for (let i = 0; i < allResources.length; i += topicsPerWeek) {
      const weekResources = allResources.slice(i, i + topicsPerWeek);
      weeks.push({
        week: weeks.length + 1,
        topics: weekResources.map((resource, idx) => ({
          id: `${weeks.length + 1}-${idx}`,
          title: resource.title || resource.url || `Topic ${idx + 1}`,
          description: resource.description || '',
          resources: resource.url ? [resource.url] : [],
          tests: resource.url && (resource.url.includes('leetcode') || resource.url.includes('geeksforgeeks')) ? [resource.url] : [],
          tags: resource.tags || [],
          difficulty: resource.difficulty || 'Medium',
          url: resource.url || ''
        }))
      });
    }

    return weeks;
  };

  const weeks = buildWeeksFromResources(roadmapData);
  const allProblems = (weeks || []).flatMap(w => (w.topics || []).map(topic => ({
    ...topic,
    week: w.week
  })));

  const handleToggleSolved = (problemId) => {
    setProgress(prev => ({ ...prev, [problemId]: !prev[problemId] }));
  };

  const handleOpenNote = (problemId) => {
    setSelectedProblemId(problemId);
    setNoteModalOpen(true);
  };

  const handleSaveNote = (note) => {
    if (selectedProblemId) {
      setNotes(prev => ({ ...prev, [selectedProblemId]: note }));
    }
    setNoteModalOpen(false);
    setSelectedProblemId(null);
  };

  const handleToggleRevision = (problemId) => {
    setRevisions(prev => ({ ...prev, [problemId]: !prev[problemId] }));
  };

  const toggleWeekOpen = (weekNo) => {
    setOpenWeeks(prev => ({ ...prev, [weekNo]: prev[weekNo] === undefined ? false : !prev[weekNo] }));
  };

  const getDifficultyColor = (difficulty) => {
    const d = difficulty?.toLowerCase() || 'medium';
    if (d.includes('easy')) return 'bg-green-600';
    if (d.includes('hard')) return 'bg-red-600';
    return 'bg-yellow-600';
  };

  const getDifficultyText = (difficulty) => {
    const d = difficulty?.toLowerCase() || 'medium';
    if (d.includes('easy')) return 'Easy';
    if (d.includes('hard')) return 'Hard';
    return 'Medium';
  };

  const hasArticle = (problem) => {
    return problem.resources && problem.resources.some(url => 
      url.includes('blog') || url.includes('article') || url.includes('medium') || url.includes('dev.to')
    );
  };

  const hasVideo = (problem) => {
    return problem.resources && problem.resources.some(url => 
      url.includes('youtube') || url.includes('video') || url.includes('watch')
    );
  };

  const getSolveUrl = (problem) => {
    if (problem.tests && problem.tests.length > 0) {
      return problem.tests[0];
    }
    if (problem.resources && problem.resources.length > 0) {
      return problem.resources[0];
    }
    return problem.url || '#';
  };

  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalCount = allProblems.length;
  const username = user?.firstName || user?.fullName || user?.username || 'there';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-8 py-6 border-b border-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-200">AlgoGuide</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/mock-interview')}
            className="px-5 py-3 rounded bg-zinc-900 hover:bg-zinc-800 text-base transition"
          >
            Start Mock Interview
          </button>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-8 py-8">
        {/* Big Welcome Banner */}
        <section className="mb-8 rounded-2xl border border-zinc-900 bg-zinc-950 px-8 py-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-sm uppercase tracking-widest text-zinc-500">Welcome</div>
              <div className="mt-2 text-5xl font-semibold text-zinc-100 leading-tight">
                {username}
              </div>
              <div className="mt-4 text-xl text-zinc-400">
                Track. Solve. Revise. Repeat.
              </div>
            </div>
            <div className="text-right text-zinc-400 text-lg">
              <div>Total: <span className="text-zinc-100 font-semibold">{totalCount}</span></div>
              <div>Completed: <span className="text-zinc-100 font-semibold">{completedCount}</span></div>
              <div>Progress: <span className="text-zinc-100 font-semibold">{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%</span></div>
            </div>
          </div>
        </section>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            <p className="mt-4 text-zinc-400 text-lg">Loading...</p>
          </div>
        ) : allProblems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-xl">No problems available. Please complete onboarding.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(weeks || []).map((w, wIdx) => {
              const weekNo = w.week || wIdx + 1;
              const isOpen = openWeeks[weekNo] !== undefined ? openWeeks[weekNo] : true;
              const topics = (w.topics || []).map((t, i) => ({ id: `${weekNo}-${i}`, ...t }));
              const weekSolved = topics.filter(t => progress[t.id]).length;

              return (
                <section key={weekNo} className="border border-zinc-900 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleWeekOpen(weekNo)}
                    className="w-full flex items-center justify-between px-6 py-5 bg-zinc-950 hover:bg-zinc-900 transition"
                  >
                    <div className="text-left">
                      <div className="text-2xl font-semibold text-zinc-100">Week {weekNo}</div>
                      <div className="mt-1 text-base text-zinc-400">
                        {weekSolved}/{topics.length} solved • {topics.length ? Math.round((weekSolved / topics.length) * 100) : 0}%
                      </div>
                    </div>
                    <div className="text-2xl text-zinc-400">{isOpen ? '▼' : '▶'}</div>
                  </button>

                  {isOpen && (
                    <div className="overflow-x-auto bg-black">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-900">
                            <th className="text-left py-4 px-6 text-sm font-normal text-zinc-500 w-16">Status</th>
                            <th className="text-left py-4 px-6 text-sm font-normal text-zinc-500">Problem</th>
                            <th className="text-left py-4 px-6 text-sm font-normal text-zinc-500 w-56">Resource</th>
                            <th className="text-left py-4 px-6 text-sm font-normal text-zinc-500 w-24">Note</th>
                            <th className="text-left py-4 px-6 text-sm font-normal text-zinc-500 w-40">Mark important</th>
                            <th className="text-left py-4 px-6 text-sm font-normal text-zinc-500 w-40">Difficulty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topics.map((problem, idx) => {
                            const isSolved = !!progress[problem.id];
                            const isRevision = !!revisions[problem.id];
                            const hasNote = !!notes[problem.id];
                            const url = getSolveUrl(problem);
                            const showArticle = hasArticle(problem);
                            const showVideo = hasVideo(problem);

                            return (
                              <tr
                                key={problem.id || idx}
                                className="border-b border-zinc-900 hover:bg-zinc-950/60 transition-colors"
                              >
                                <td className="py-5 px-6">
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isSolved}
                                      onChange={() => handleToggleSolved(problem.id)}
                                      className="w-6 h-6 rounded border-zinc-700 bg-black text-green-500 focus:ring-0 cursor-pointer"
                                    />
                                  </label>
                                </td>

                                <td className="py-5 px-6">
                                  <div className="text-xl font-medium text-zinc-100">{problem.title}</div>
                                  {problem.description ? (
                                    <div className="mt-1 text-base text-zinc-500 line-clamp-1">{problem.description}</div>
                                  ) : null}
                                </td>

                                <td className="py-5 px-6">
                                  {url && url !== '#' ? (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-3 text-lg text-zinc-200 hover:text-white"
                                      title="Open resource"
                                    >
                                      <span className="underline">Open</span>
                                      <span className="text-xl">{showArticle ? '📄' : '🔗'}</span>
                                      {showVideo ? <span className="text-xl">▶️</span> : null}
                                    </a>
                                  ) : (
                                    <span className="text-zinc-600 text-lg">—</span>
                                  )}
                                </td>

                                <td className="py-5 px-6">
                                  <button
                                    onClick={() => handleOpenNote(problem.id)}
                                    className={`text-2xl cursor-pointer ${hasNote ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title={hasNote ? 'Edit note' : 'Add note'}
                                  >
                                    {hasNote ? '📝' : '➕'}
                                  </button>
                                </td>

                                <td className="py-5 px-6">
                                  <button
                                    onClick={() => handleToggleRevision(problem.id)}
                                    className="text-3xl cursor-pointer leading-none"
                                    title={isRevision ? 'Marked important' : 'Mark important'}
                                  >
                                    {isRevision ? '★' : '☆'}
                                  </button>
                                </td>

                                <td className="py-5 px-6">
                                  <span className={`inline-block px-4 py-2 rounded-full text-base font-semibold ${getDifficultyColor(problem.difficulty)}`}>
                                    {getDifficultyText(problem.difficulty)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Note Modal */}
      {noteModalOpen && (
        <NoteModal
          problem={allProblems.find(p => p.id === selectedProblemId)}
          existingNote={notes[selectedProblemId] || ''}
          onSave={handleSaveNote}
          onClose={() => {
            setNoteModalOpen(false);
            setSelectedProblemId(null);
          }}
        />
      )}

      {/* Ask Mentor Button */}
      <AiMentorButton onClick={() => setMentorModalOpen(true)} />
      
      {/* AI Mentor Modal */}
      <AiMentorModal 
        open={mentorModalOpen} 
        onClose={() => setMentorModalOpen(false)}
        userProfile={roadmapData?.user_profile}
        roadmapData={roadmapData}
      />
    </div>
  );
}

// Note Modal Component
function NoteModal({ problem, existingNote, onSave, onClose }) {
  const [note, setNote] = useState(existingNote || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(note);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-800">
          <h3 className="font-semibold text-xl text-zinc-100">{problem?.title || 'Add Note'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add your notes here: edge cases, mistakes, patterns, tricks..."
            className="w-full h-48 px-4 py-3 bg-black border border-zinc-800 rounded-xl text-lg text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 text-lg text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-3 text-lg bg-zinc-800 hover:bg-zinc-700 rounded-xl"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
