import { useEffect } from 'react';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Landing() {
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
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-100 to-blue-300">
      <h1 className="text-4xl font-bold mb-2">AlgoGuide</h1>
      <p className="mb-6 text-gray-700 text-lg text-center max-w-xl">
        Your personalized, AI-powered placement preparation guide! Get a custom roadmap, best resources, and interactive mock interviews tailored just for you.
      </p>
      <SignInButton mode="modal">
        <button
          className="px-5 py-2 bg-blue-700 text-white rounded-md shadow hover:bg-blue-900 transition font-semibold"
        >
          Get Started
        </button>
      </SignInButton>
    </div>
  );
}
