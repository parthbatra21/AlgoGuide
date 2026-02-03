import { useUser, UserButton, SignedIn } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const { user } = useUser();
  const [roadmapData, setRoadmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
        
        // Fetch data from the home endpoint that was called during onboarding
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
          const errorText = await response.text();
          console.error('Error response body:', errorText);
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

  const toggleSection = (index) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Build roadmap structure from API data
  const buildRoadmapFromData = () => {
    if (!roadmapData) {
      return {
        totalProgress: { completed: 0, total: 0 },
        difficulty: {
          easy: { completed: 0, total: 0 },
          medium: { completed: 0, total: 0 },
          hard: { completed: 0, total: 0 }
        },
        steps: []
      };
    }

    // Extract resources from different categories in the API response
    const allResources = [];
    
    // Check different possible data structures
    if (roadmapData.resources) {
      if (roadmapData.resources.general_learning) {
        allResources.push(...roadmapData.resources.general_learning);
      }
      if (roadmapData.resources.company_specific) {
        allResources.push(...roadmapData.resources.company_specific);
      }
      if (roadmapData.resources.technical_skills) {
        allResources.push(...roadmapData.resources.technical_skills);
      }
    }
    
    // If resources are at the top level
    if (roadmapData.general_learning) {
      allResources.push(...roadmapData.general_learning);
    }
    if (roadmapData.company_specific) {
      allResources.push(...roadmapData.company_specific);
    }
    if (roadmapData.technical_skills) {
      allResources.push(...roadmapData.technical_skills);
    }

    const totalResources = allResources.length;
    const resourcesPerStep = Math.ceil(totalResources / 4);

    return {
      totalProgress: { completed: 0, total: totalResources },
      difficulty: {
        easy: { completed: 0, total: Math.floor(totalResources * 0.3) },
        medium: { completed: 0, total: Math.floor(totalResources * 0.5) },
        hard: { completed: 0, total: Math.floor(totalResources * 0.2) }
      },
      steps: [
        {
          title: "Step 1: Build Foundation",
          completed: 0,
          total: resourcesPerStep,
          resources: allResources.slice(0, resourcesPerStep)
        },
        {
          title: "Step 2: Strengthen Weak Areas",
          completed: 0,
          total: resourcesPerStep,
          resources: allResources.slice(resourcesPerStep, resourcesPerStep * 2)
        },
        {
          title: "Step 3: Company-Specific Prep",
          completed: 0,
          total: resourcesPerStep,
          resources: allResources.slice(resourcesPerStep * 2, resourcesPerStep * 3)
        },
        {
          title: "Step 4: Tech Stack Deep Dive",
          completed: 0,
          total: totalResources - (resourcesPerStep * 3),
          resources: allResources.slice(resourcesPerStep * 3)
        }
      ]
    };
  };

  const roadmap = buildRoadmapFromData();

  const progressPercentage = roadmap.totalProgress.total > 0 
    ? Math.round((roadmap.totalProgress.completed / roadmap.totalProgress.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Left Sidebar */}
      <div className={`w-20 bg-gray-800 fixed left-0 top-0 bottom-0 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-40 flex flex-col items-center py-6 border-r border-gray-700`}>
        <div className="mb-8 cursor-pointer" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <div className="bg-orange-500 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl">
            AG
          </div>
        </div>
        <nav className="flex-1 space-y-4">
          <NavItem icon="📚" label="Course" />
          <NavItem icon="📝" label="Blogs" />
          <NavItem icon="🎤" label="Interview" active />
          <NavItem icon="📊" label="Dashboard" />
        </nav>
        <div className="space-y-4">
          <button className="text-gray-400 hover:text-white transition">
            <span className="text-2xl">🌙</span>
          </button>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <div className="flex-1 p-8 pt-6 overflow-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="flex gap-3">
              <button className="bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition">
                🔍
              </button>
              <select className="bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition">
                <option>Difficulty</option>
              </select>
              <button className="bg-orange-500 px-4 py-2 rounded-lg hover:bg-orange-600 transition">
                &lt;&gt; Pick Random
              </button>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <p className="text-gray-400 mb-2">Total Progress</p>
                <p className="text-2xl font-bold mb-3">
                  {roadmap.totalProgress.completed} / {roadmap.totalProgress.total}
                </p>
                <div className="relative w-full h-4 bg-gray-700 rounded-full">
                  <div 
                    className="absolute top-0 left-0 h-4 bg-orange-500 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400 mt-2">{progressPercentage}%</p>
              </div>
              <ProgressCard label="Easy" completed={roadmap.difficulty.easy.completed} total={roadmap.difficulty.easy.total} />
              <ProgressCard label="Medium" completed={roadmap.difficulty.medium.completed} total={roadmap.difficulty.medium.total} />
              <ProgressCard label="Hard" completed={roadmap.difficulty.hard.completed} total={roadmap.difficulty.hard.total} />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-1 border-b border-gray-700">
            <button className="px-4 py-2 border-b-2 border-orange-500 text-orange-500 font-semibold">
              All Problems
            </button>
            <button className="px-4 py-2 text-gray-400 hover:text-white transition">
              Revision
            </button>
          </div>

          {/* Debug Info (remove in production) */}
          {roadmapData && (
            <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <details>
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">
                  Debug: API Response Data Structure
                </summary>
                <pre className="mt-2 text-xs text-gray-300 overflow-auto max-h-40">
                  {JSON.stringify(roadmapData, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Roadmap Steps */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <p className="mt-4 text-gray-400">Loading your roadmap...</p>
            </div>
          ) : roadmap.steps.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No roadmap data available. Please complete the onboarding process.</p>
              {!roadmapData && (
                <p className="text-sm text-gray-500 mt-2">No API response received.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {roadmap.steps.map((step, index) => (
                <div key={index} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-750 transition"
                    onClick={() => toggleSection(index)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <button className="text-orange-500 font-bold">
                        {expandedSections[index] ? '▼' : '▶'}
                      </button>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{step.title}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex-1 max-w-xs h-2 bg-gray-700 rounded-full">
                            <div 
                              className="h-2 bg-orange-500 rounded-full"
                              style={{ width: `${step.total > 0 ? (step.completed / step.total) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-400">
                            {step.completed} / {step.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {expandedSections[index] && (
                    <div className="border-t border-gray-700 p-4 space-y-3">
                      {step.resources.map((resource, idx) => (
                        <a
                          key={idx}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                        >
                          <h4 className="font-medium">{resource.title}</h4>
                          <p className="text-sm text-gray-400 mt-1">{resource.description}</p>
                          <div className="flex gap-2 mt-2">
                            {resource.tags?.map((tag, tagIdx) => (
                              <span key={tagIdx} className="px-2 py-1 bg-gray-600 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="hidden lg:block w-80 bg-gray-800 border-l border-gray-700 p-6 overflow-auto">
          <div className="space-y-4 sticky top-6">
            <SidebarCard number="01" title="BASICS" icon="🎯" />
            <SidebarCard number="02" title="DATA STRUCTURES" icon="🎯" />
            <SidebarCard number="03" title="ALGORITHMS" icon="🎯" />
            <SidebarCard number="04" title="SYSTEM DESIGN" icon="🎯" />
            <div className="mt-8">
              <button className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold transition">
                Enroll Now to get started
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }) {
  return (
    <div className={`text-center group cursor-pointer py-2 px-3 rounded-lg transition ${active ? 'bg-gray-700' : 'hover:bg-gray-700'}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function ProgressCard({ label, completed, total }) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <p className="text-gray-400 mb-2">{label}</p>
      <p className="text-2xl font-bold mb-3">{completed} / {total} completed</p>
      <div className="relative w-full h-4 bg-gray-700 rounded-full">
        <div 
          className="absolute top-0 left-0 h-4 bg-orange-500 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function SidebarCard({ number, title, icon }) {
  return (
    <div className="bg-gray-750 border border-gray-600 rounded-lg p-4 cursor-pointer hover:border-orange-500 transition">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-gray-400 text-xs">{number}</p>
          <p className="font-semibold">{title}</p>
        </div>
      </div>
    </div>
  );
}
