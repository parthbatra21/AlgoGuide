import { SignIn, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SignInPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('SignIn page - Auth state:', { isSignedIn, isLoaded, path: location.pathname });
    
    if (isLoaded && isSignedIn) {
      const onboardingCompleted = Boolean(user?.unsafeMetadata?.onboardingCompleted);
      console.log('User is signed in, onboarding completed:', onboardingCompleted);
      
      // Redirect authenticated users
      if (onboardingCompleted) {
        console.log('Redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      } else {
        console.log('Redirecting to onboarding');
        navigate('/onboarding', { replace: true });
      }
    }
  }, [isSignedIn, isLoaded, user, navigate, location.pathname]);

  // Don't render SignIn component if user is already authenticated
  if (isLoaded && isSignedIn) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <p className="mt-4">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 px-8 py-8">
          <div className="text-sm uppercase tracking-widest text-zinc-500">AlgoGuide</div>
          <h1 className="mt-2 text-4xl font-semibold text-zinc-100">Sign in</h1>
          <p className="mt-2 text-lg text-zinc-400">Continue where you left off.</p>

          <div className="mt-8 flex justify-center">
            <SignIn
              signUpUrl="/signup"
              routing="path"
              path="/signin"
              fallbackRedirectUrl="/dashboard"
            />
          </div>
        </div>
      </div>
    </main>
  );
}


