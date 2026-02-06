import { SignUp, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SignUpPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const onboardingCompleted = Boolean(user?.unsafeMetadata?.onboardingCompleted);
      navigate(onboardingCompleted ? '/dashboard' : '/onboarding', { replace: true });
    }
  }, [isSignedIn, isLoaded, user, navigate]);

  if (isLoaded && isSignedIn) {
    return null;
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-[color:var(--bg-gradient-start)] to-[color:var(--bg-gradient-end)] px-6 py-12">
      <SignUp 
        routing="path" 
        path="/signup"
        signInUrl="/signin"
        fallbackRedirectUrl="/onboarding"
      />
    </main>
  );
}
