import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuthContext } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import MainPage from "./pages/MainPage";
import AIadvisorPage from "./pages/AIadvisorPage";
import ProjectPage from "./pages/ProjectPage";
import SettingsPage from "./pages/SettingsPage";
import AINextStepPage from "./pages/AINextStepPage";
import NormalNextStepPage from "./pages/NormalNextStepPage";
import DevProjectsPage from "./pages/Dev/DevProjectsPage";

export default function App() {
  // 보호 라우트
  const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuthContext();
    if (loading) return <div>Loading...</div>; // 로딩 상태 처리
    return user ? children : <Navigate to="/login" replace />;
  };

  // 게스트 라우트
  const GuestRoute = ({ children }) => {
    const { user, loading } = useAuthContext();
    if (loading) return <div>Loading...</div>; // 로딩 상태 처리
    return !user ? children : <Navigate to="/main" replace />;
  };

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 로그인/회원가입 */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <SignupPage />
              </GuestRoute>
            }
          />
          <Route path="/" element={<Navigate to="/main" replace />} />

          {/* 보호 라우트 */}
          <Route
            path="/main"
            element={
              <ProtectedRoute>
                <MainPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aiadvisor"
            element={
              <ProtectedRoute>
                <AIadvisorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project"
            element={
              <ProtectedRoute>
                <ProjectPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-next-step"
            element={
              <ProtectedRoute>
                <AINextStepPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/normal-next-step"
            element={
              <ProtectedRoute>
                <NormalNextStepPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dev/projects"
            element={
              <ProtectedRoute>
                <DevProjectsPage />
              </ProtectedRoute>
            }
          />

          {/* 그 외 경로 */}
          <Route path="*" element={<Navigate to="/main" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
