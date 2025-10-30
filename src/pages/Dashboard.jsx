import { useUser, UserButton, SignedIn } from '@clerk/clerk-react';

export default function Dashboard() {
  const { user } = useUser();
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 py-10">
      <header className="w-full flex items-center justify-between px-8 mb-12">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      <main className="flex flex-col items-center w-full max-w-2xl">
        <h3 className="text-xl font-semibold mb-2">Welcome, {user?.firstName || 'User'}!</h3>
        <div className="bg-white rounded-lg shadow p-6 mt-4 w-full min-h-[150px] text-center">
          {/* TODO: Show onboarding form or roadmap here */}
          <span className="text-gray-400">Your personalized roadmap will appear here.</span>
        </div>
      </main>
    </div>
  );
}
