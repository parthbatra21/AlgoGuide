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
  const { user } = useUser();
  const location = useLocation();
  const onboardingCompleted = Boolean(user?.publicMetadata?.onboardingCompleted);
  if (!onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function OnboardingOnlyGuard({ children }) {
  const { user } = useUser();
  const onboardingCompleted = Boolean(user?.publicMetadata?.onboardingCompleted);
  if (onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
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
