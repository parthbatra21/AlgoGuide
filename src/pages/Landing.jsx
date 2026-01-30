import Hero from '../components/Hero';
import FeatureGrid from '../components/FeatureGrid';
import { useEffect } from 'react';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';

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
    <main>
      <Hero heroImageSrc="/assets/0_SrT98pfmh6s3xHTU.jpg" />
      <FeatureGrid features={features} />
    </main>
  );
}
