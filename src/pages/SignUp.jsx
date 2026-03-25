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
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 px-8 py-8">
          <div className="text-sm uppercase tracking-widest text-zinc-500">AlgoGuide</div>
          <h1 className="mt-2 text-4xl font-semibold text-zinc-100">Create your account</h1>
          <p className="mt-2 text-lg text-zinc-400">Start tracking your prep like a spreadsheet—without the chaos.</p>

          <div className="mt-8 flex justify-center">
            <SignUp
              routing="path"
              path="/signup"
              signInUrl="/signin"
              fallbackRedirectUrl="/onboarding"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
