import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-[color:var(--bg-gradient-start)] to-[color:var(--bg-gradient-end)] px-6 py-12">
      <SignIn signUpUrl="/signin" routing="path" path="/signin" />
    </main>
  );
}


