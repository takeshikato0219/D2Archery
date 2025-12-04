import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './pages/HomePage';
import { CoachesPage } from './pages/CoachesPage';
import { ChatPage } from './pages/ChatPage';
import { ScoresPage } from './pages/ScoresPage';
import { EquipmentPage } from './pages/EquipmentPage';
import { RankingPage } from './pages/RankingPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminTeachingPage } from './pages/AdminTeachingPage';
import { ScoringPage } from './pages/ScoringPage';
import { TeamPage } from './pages/TeamPage';
import './lib/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/coaches" element={<CoachesPage />} />
        <Route path="/coaches/:coachId" element={<ChatPage />} />
        <Route path="/scores" element={<ScoresPage />} />
        <Route path="/scoring" element={<ScoringPage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin/teaching" element={<AdminTeachingPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
