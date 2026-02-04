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
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-[color:var(--bg-gradient-start)] to-[color:var(--bg-gradient-end)] px-6 py-12">
      <SignIn 
        signUpUrl="/signin" 
        routing="path" 
        path="/signin"
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/onboarding"
      />
    </main>
  );
}


