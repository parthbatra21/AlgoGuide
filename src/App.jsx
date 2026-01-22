import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUser, SignIn, SignUp } from '@clerk/clerk-react';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';

function ProtectedRoute({ children }) {
  const { isSignedIn } = useUser();
  return isSignedIn ? children : <Navigate to="/sign-in" replace />;
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
        <Route path="/sign-in" element={<SignIn routing="path" path="/sign-in" redirectUrl="/onboarding" />} />
        <Route path="/sign-up" element={<SignUp routing="path" path="/sign-up" redirectUrl="/onboarding" />} />
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
