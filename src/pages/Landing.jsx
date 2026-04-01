import Hero from '../components/Hero';
import FeatureGrid from '../components/FeatureGrid';
import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';
import CTAButton from '../components/CTAButton';

export default function Landing() {
  const features = [
    { title: 'Smart AI Roadmap Generator', icon: 'spark' },
    { title: 'Seamless Authentication', icon: 'shield' },
    { title: 'Dynamic Onboarding Flow', icon: 'flow' },
    { title: 'AI-Powered Resource Finder', icon: 'search' },
    { title: 'Interactive Mock Interviews', icon: 'chat' },
    { title: 'Personalized Feedback Reports', icon: 'report' },
  ];
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onboardingCompleted = Boolean(user?.publicMetadata?.onboardingCompleted);

  useEffect(() => {
    if (isSignedIn && pathname === "/") {
      if (onboardingCompleted) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [isSignedIn, onboardingCompleted, pathname, navigate]);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="w-full flex items-center justify-between px-8 py-6 border-b border-zinc-900">
        <div className="text-2xl font-semibold text-zinc-200">AlgoGuide</div>
        <div className="flex items-center gap-3">
          <CTAButton href="/signin" className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 shadow-none rounded-xl px-6 py-3 text-base" />
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-8 py-10">
        <section className="rounded-2xl border border-zinc-900 bg-zinc-950 px-8 py-10">
          <div className="text-sm uppercase tracking-widest text-zinc-500">AlgoGuide</div>
          <h1 className="mt-3 text-5xl font-semibold text-zinc-100 leading-tight">
            An Excel sheet for DSA prep — but smarter.
          </h1>
          <p className="mt-4 text-xl text-zinc-400 max-w-3xl">
            Track problems. Know what to solve next. Revise efficiently. No noise.
          </p>
          <div className="mt-8">
            <CTAButton href="/signin" className="bg-zinc-800 hover:bg-zinc-700 ring-1 ring-zinc-700 shadow-none rounded-xl px-8 py-4 text-lg" />
          </div>
        </section>

        <div className="mt-10">
          <FeatureGrid features={features} />
        </div>
      </main>
    </div>
  );
}
