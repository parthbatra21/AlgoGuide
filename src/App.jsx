import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import SignInPage from './pages/SignIn';

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useUser();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }
  
  console.log('ProtectedRoute - isSignedIn:', isSignedIn);
  return isSignedIn ? children : <Navigate to="/signin" replace />;
}

function OnboardingGuard({ children }) {
  const { user, isLoaded } = useUser();
  const location = useLocation();
  
  if (!isLoaded) return null;
  
  const onboardingCompleted = Boolean(user?.unsafeMetadata?.onboardingCompleted);
  console.log('OnboardingGuard - onboardingCompleted:', onboardingCompleted, 'path:', location.pathname);
  
  if (!onboardingCompleted && location.pathname !== '/onboarding') {
    console.log('Redirecting to onboarding from OnboardingGuard');
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function OnboardingOnlyGuard({ children }) {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded) return null;
  
  const onboardingCompleted = Boolean(user?.unsafeMetadata?.onboardingCompleted);
  console.log('OnboardingOnlyGuard - onboardingCompleted:', onboardingCompleted);
  
  if (onboardingCompleted) {
    console.log('Redirecting to dashboard from OnboardingOnlyGuard');
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AuthPageGuard({ children }) {
  const { isSignedIn, isLoaded, user } = useUser();
  
  if (!isLoaded) return null;
  
  console.log('AuthPageGuard - isSignedIn:', isSignedIn);
  
  if (!isSignedIn) return children;
  
  const onboardingCompleted = Boolean(user?.unsafeMetadata?.onboardingCompleted);
  console.log('AuthPageGuard - redirecting to:', onboardingCompleted ? '/dashboard' : '/onboarding');
  
  return <Navigate to={onboardingCompleted ? '/dashboard' : '/onboarding'} replace />;
}

export default function App() {
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
            console.log('Firebase UID:', fbUser.uid);
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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={
          <AuthPageGuard>
            <SignInPage />
          </AuthPageGuard>
        } />
        <Route path="/signin/sso-callback" element={
          <AuthPageGuard>
            <SignInPage />
          </AuthPageGuard>
        } />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <Dashboard />
              </OnboardingGuard>
            </ProtectedRoute>
          }
        />
        <Route 
          path="/onboarding" 
          element={
            <ProtectedRoute>
              <OnboardingOnlyGuard>
                <Onboarding />
              </OnboardingOnlyGuard>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
