import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import SignInPage from './pages/SignIn';

function ProtectedRoute({ children }) {
  const { isSignedIn } = useUser();
  return isSignedIn ? children : <Navigate to="/signin" replace />;
}

function OnboardingGuard({ children }) {
  const { user, isLoaded } = useUser();
  const location = useLocation();
  if (!isLoaded) return null;
  const onboardingCompleted = Boolean(user?.unsafeMetadata?.onboardingCompleted);
  if (!onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function OnboardingOnlyGuard({ children }) {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  const onboardingCompleted = Boolean(user?.unsafeMetadata?.onboardingCompleted);
  if (onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AuthPageGuard({ children }) {
  const { isSignedIn, isLoaded, user } = useUser();
  if (!isLoaded) return null;
  if (!isSignedIn) return children;
  const onboardingCompleted = Boolean(user?.unsafeMetadata?.onboardingCompleted);
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
      } catch (error) {
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
        <Route path="/signin" element={<SignInPage />} />
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
