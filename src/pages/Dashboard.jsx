import { useUser, UserButton, SignedIn } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderOverview from '../components/roadmap/HeaderOverview';
import TimelineWeek from '../components/roadmap/TimelineWeek';
import TopicModal from '../components/roadmap/TopicModal';
import ProgressSidebar from '../components/roadmap/ProgressSidebar';
import AiMentorButton from '../components/roadmap/AiMentorButton';
import AiMentorModal from '../components/roadmap/AiMentorModal';

export default function Dashboard() {
  const { user } = useUser();
  const [roadmapData, setRoadmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  // per-week expand state handled inside TimelineWeek
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [progress, setProgress] = useState({});
  const [mentorModalOpen, setMentorModalOpen] = useState(false);
  const navigate = useNavigate();

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
          console.log('Resources structure:', data.resources);
          console.log('Weeks array:', data.weeks);
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

  // per-week collapse handled in TimelineWeek, no section toggler here

  // Build roadmap structure from API data (kept local for clarity)
  const buildFromData = () => {
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
  // invoke builder to ensure variables derived are in-sync when roadmapData changes
  buildFromData();

  // Build aggregate info if needed later

  // legacy aggregate; derived sidebar shows main overallPct instead

  // Build weeks from resources if weeks array doesn't exist in response
  const buildWeeksFromResources = (data) => {
    if (!data) return [];
    
    // If weeks already exist, use them
    if (Array.isArray(data.weeks) && data.weeks.length > 0) {
      return data.weeks;
    }

    // Otherwise, build weeks from resources
    const allResources = [];
    
    // Collect all resources from different categories
    if (data.resources) {
      Object.values(data.resources).forEach(category => {
        if (Array.isArray(category)) {
          allResources.push(...category);
        }
      });
    }

    // If no resources, return empty
    if (allResources.length === 0) {
      console.warn('No resources found in roadmap data:', data);
      return [];
    }

    // Group resources into weeks (6 topics per week)
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
          tags: resource.tags || []
        }))
      });
    }

    return weeks;
  };

  const weeks = buildWeeksFromResources(roadmapData);
  console.log('Built weeks:', weeks);
  const flattenTopics = (weeks || []).flatMap(w => (w.topics || []));
  const totalTopics = flattenTopics.length;
  const completedTopics = Object.values(progress).filter(Boolean).length;
  const overallPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const handleToggleTopic = (topicId) => {
    setProgress(prev => ({ ...prev, [topicId]: !prev[topicId] }));
    // TODO: persist to backend (Firestore/Supabase)
  };

  const handleAskMentor = () => {
    setMentorModalOpen(true);
  };

  const handleRegenerate = () => {
    console.log('Regenerate roadmap requested');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold">AlgoGuide</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/mock-interview')}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 transition"
          >
            Start Mock Interview
          </button>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <HeaderOverview
            goal={`Preparing for ${roadmapData?.user_profile?.preferred_role || 'SDE'} (${roadmapData?.user_profile?.target_timeline || 'Plan'})`}
            weeksTotal={weeks.length || 0}
            currentWeek={Math.min(weeks.length || 0, 1)}
            progressPct={overallPct}
            studyHours={roadmapData?.user_profile?.daily_hours || roadmapData?.user_profile?.study_hours}
            tip={roadmapData?.mentor_tip}
            onRegenerate={handleRegenerate}
          />

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <p className="mt-4 text-gray-400">Loading your roadmap...</p>
            </div>
          ) : weeks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No roadmap data available. Please complete the onboarding process.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {weeks.map((w, idx) => (
                <TimelineWeek
                  key={w.week || idx}
                  week={w.week || idx + 1}
                  topics={(w.topics || []).map((t, i) => ({ id: `${w.week || idx + 1}-${i}`, ...t }))}
                  progressMap={progress}
                  onToggle={handleToggleTopic}
                  onOpen={setSelectedTopic}
                />
              ))}
            </div>
          )}
        </div>
        <div className="lg:col-span-1">
          <ProgressSidebar completed={completedTopics} total={totalTopics} upcoming={weeks[0]?.topics || []} />
        </div>
      </main>

      <TopicModal open={!!selectedTopic} topic={selectedTopic} onClose={() => setSelectedTopic(null)} onAskMentor={handleAskMentor} />
      <AiMentorButton onClick={() => setMentorModalOpen(true)} />
      <AiMentorModal 
        open={mentorModalOpen} 
        onClose={() => setMentorModalOpen(false)}
        userProfile={roadmapData?.user_profile}
        roadmapData={roadmapData}
      />
    </div>
  );
}
