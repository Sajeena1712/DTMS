import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { TaskProvider } from "./contexts/TaskContext";
import AppShell from "./components/layout/AppShell";
import FullscreenLoader from "./components/ui/FullscreenLoader";
import { isAdminRole, isUserRole } from "./lib/constants";

const IntroVideoPage = lazy(() => import("./pages/IntroVideoPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage"));
const AdminDashboardPage = lazy(() => import("./pages/dashboard/AdminDashboardPage"));
const AnalyticsPage = lazy(() => import("./pages/dashboard/AnalyticsPage"));
const CalendarPage = lazy(() => import("./pages/dashboard/CalendarPage"));
const LeaderboardPage = lazy(() => import("./pages/dashboard/LeaderboardPage"));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));
const TeamPage = lazy(() => import("./pages/dashboard/TeamPage"));
const UserDashboardPage = lazy(() => import("./pages/dashboard/UserDashboardPage"));
const UsersPage = lazy(() => import("./pages/dashboard/UsersPage"));
const TaskListPage = lazy(() => import("./pages/tasks/TaskListPage"));
const TaskCreatePage = lazy(() => import("./pages/tasks/TaskCreatePage"));
const TaskEditPage = lazy(() => import("./pages/tasks/TaskEditPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function SessionGate({ children }) {
  const { booting } = useAuth();

  if (booting) {
    return <FullscreenLoader title="Initializing DTMS..." subtitle="Restoring your session, validating access, and loading your workspace." />;
  }

  return children;
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function RoleRoute({ allowedRole, children }) {
  const { user } = useAuth();
  const isAllowed = allowedRole === "admin" ? isAdminRole(user?.role) : isUserRole(user?.role);
  if (!isAllowed) {
    return <Navigate to={isAdminRole(user?.role) ? "/admin-dashboard" : "/user-dashboard"} replace />;
  }
  return children;
}

function AuthedLayout() {
  const { user } = useAuth();
  return <AppShell variant={isAdminRole(user?.role) ? "admin" : "user"}><Outlet /></AppShell>;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return children;
  return <Navigate to={isAdminRole(user?.role) ? "/admin-dashboard" : "/user-dashboard"} replace />;
}

function RouteLoader() {
  return <FullscreenLoader title="Initializing DTMS..." subtitle="Loading the next experience with secure workspace context." />;
}

function IntroGate({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const targetRef = useRef("/");

  useEffect(() => {
    const path = location.pathname === "/" ? null : `${location.pathname}${location.search}${location.hash}`;
    targetRef.current =
      path ||
      (isAuthenticated
        ? isAdminRole(user?.role)
          ? "/admin-dashboard"
          : "/user-dashboard"
        : "/login");
  }, [isAuthenticated, location.hash, location.pathname, location.search, user?.role]);

  function handleFinish() {
    setShowIntro(false);
    if (location.pathname === "/") {
      navigate(targetRef.current, { replace: true });
    }
  }

  if (showIntro) {
    return <IntroVideoPage onFinish={handleFinish} />;
  }

  return children;
}

function RouteTransitionGate({ children }) {
  const location = useLocation();
  const previousPathRef = useRef(null);
  const [showPageLoader, setShowPageLoader] = useState(false);

  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}${location.hash}`;

    if (previousPathRef.current && previousPathRef.current !== currentPath) {
      setShowPageLoader(true);

      const timer = setTimeout(() => {
        setShowPageLoader(false);
      }, 900);

      previousPathRef.current = currentPath;
      return () => clearTimeout(timer);
    }

    previousPathRef.current = currentPath;
    return undefined;
  }, [location.hash, location.pathname, location.search]);

  if (showPageLoader) {
    return (
      <FullscreenLoader
        title="Initializing DTMS..."
        subtitle="Loading the next page, syncing interface state, and preparing your workspace."
      />
    );
  }

  return children;
}

function AppRoutes() {
  return (
    <SessionGate>
      <IntroGate>
        <RouteTransitionGate>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
              <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
              <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
              <Route path="/reset-password/:token" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />
              <Route path="/verify-email/:token" element={<PublicOnlyRoute><VerifyEmailPage /></PublicOnlyRoute>} />
              <Route element={<ProtectedRoute><AuthedLayout /></ProtectedRoute>}>
                <Route path="/admin-dashboard" element={<RoleRoute allowedRole="admin"><AdminDashboardPage /></RoleRoute>} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/team" element={<RoleRoute allowedRole="admin"><TeamPage /></RoleRoute>} />
                <Route path="/users" element={<RoleRoute allowedRole="admin"><UsersPage /></RoleRoute>} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/user-dashboard" element={<RoleRoute allowedRole="user"><UserDashboardPage /></RoleRoute>} />
                <Route path="/tasks" element={<TaskListPage />} />
                <Route path="/tasks/create" element={<RoleRoute allowedRole="admin"><TaskCreatePage /></RoleRoute>} />
                <Route path="/tasks/:taskId/edit" element={<RoleRoute allowedRole="admin"><TaskEditPage /></RoleRoute>} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </RouteTransitionGate>
      </IntroGate>
    </SessionGate>
  );
}

export default function App() {
  function AppContent() {
    const { actionLoading, actionLabel } = useAuth();

    return (
      <>
        <HashRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3200,
              style: {
                background: "#121826",
                color: "#f8fafc",
                border: "1px solid rgba(148, 163, 184, 0.15)",
                boxShadow: "0 24px 80px rgba(2, 6, 23, 0.4)",
              },
            }}
          />
        </HashRouter>

        {actionLoading ? (
          <FullscreenLoader
            title={actionLabel}
            subtitle="Digital Talent Management System is processing your request securely."
          />
        ) : null}
      </>
    );
  }

  return (
    <AuthProvider>
      <TaskProvider>
        <AppContent />
      </TaskProvider>
    </AuthProvider>
  );
}
