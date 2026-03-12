import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Challenges from './pages/Challenges';
import ChallengeDetail from './pages/ChallengeDetail';
import Scoreboard from './pages/Scoreboard';
import Events from './pages/Events';
import Pricing from './pages/Pricing';
import PaymentSuccess from './pages/PaymentSuccess';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Account from './pages/Account';
import Teams from './pages/Teams';
import Landing from './pages/Landing';
import JoinSchool   from './pages/JoinSchool';
import MySchool     from './pages/MySchool';
import Learn        from './pages/Learn';
import CourseDetail from './pages/CourseDetail';
import ExamLive          from './pages/ExamLive';
import TeacherDashboard  from './pages/TeacherDashboard';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-nkt-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-nkt-muted font-mono text-xs tracking-widest">LOADING...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'manager';
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/dashboard" replace />;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />

        <Route path="/login"             element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register"          element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/verify-email"      element={<VerifyEmail />} />

        <Route path="/dashboard"         element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/challenges"        element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
        <Route path="/challenges/:id"    element={<ProtectedRoute><ChallengeDetail /></ProtectedRoute>} />
        <Route path="/scoreboard"        element={<ProtectedRoute><Scoreboard /></ProtectedRoute>} />
        <Route path="/events"            element={<ProtectedRoute><Events /></ProtectedRoute>} />
        <Route path="/pricing"           element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
        <Route path="/payment/success"   element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
        <Route path="/teams"             element={<ProtectedRoute><Teams /></ProtectedRoute>} />
        <Route path="/profile"           element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/:username" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/account"           element={<ProtectedRoute><Account /></ProtectedRoute>} />

        {/* ── EDU ── */}
        <Route path="/join-school"       element={<ProtectedRoute><JoinSchool /></ProtectedRoute>} />
        <Route path="/my-school"         element={<ProtectedRoute><MySchool /></ProtectedRoute>} />
        <Route path="/learn"             element={<ProtectedRoute><Learn /></ProtectedRoute>} />
        <Route path="/learn/:id"         element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
        <Route path="/exam/:id/live"     element={<ProtectedRoute><ExamLive /></ProtectedRoute>} />
        <Route path="/teacher"            element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />

        <Route path="/admin" element={
          <ProtectedRoute><AdminRoute><Admin /></AdminRoute></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}