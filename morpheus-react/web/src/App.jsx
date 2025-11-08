import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import MainPage from "./pages/MainPage";
import AIadvisorPage from "./pages/AIadvisorPage";
import ProjectPage from "./pages/ProjectPage";
import SettingsPage from "./pages/SettingsPage";
import AINextStepPage from "./pages/AINextStepPage";
import NormalNextStepPage from "./pages/NormalNextStepPage";

// 개발자용 페이지
import DevProjectsPage from "./pages/Dev/DevProjectsPage";

import { getUser, setAuth, logout } from "./utils/auth";

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState(getUser());

  // 로그인 상태 갱신
  const handleLogin = (userData) => {
    setAuth(userData); // localStorage 저장
    setUser(userData);  // 상태 갱신
  };

  // 로그아웃
  const handleLogout = () => {
    logout();      // localStorage 삭제
    setUser(null); // 상태 갱신
  };

  return (
    <Router>
      <Routes>
        {/* 로그인/회원가입 라우팅 */}
        <Route
          path="/login"
          element={user ? <Navigate to="/main" /> : <LoginPage onLogin={handleLogin} />}
        />
        <Route
          path="/signup"
          element={user ? (
            <Navigate to="/main" />
          ) : (
            <SignupPage onSignupSuccess={() => window.location.replace("/login")} />
          )}
        />
        <Route path="/" element={<Navigate to={user ? "/main" : "/login"} />} />

        {/* 로그인 후 접근 가능한 페이지 */}
        <Route path="/main" element={user ? <MainPage /> : <Navigate to="/login" />} />
        <Route path="/aiadvisor" element={user ? <AIadvisorPage /> : <Navigate to="/login" />} />
        <Route path="/project" element={user ? <ProjectPage setIsModalOpen={setIsModalOpen} /> : <Navigate to="/login" />} />
        <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/login" />} />
        <Route path="/ai-next-step" element={user ? <AINextStepPage /> : <Navigate to="/login" />} />
        <Route path="/normal-next-step" element={user ? <NormalNextStepPage /> : <Navigate to="/login" />} />

        {/* 개발자용 페이지 */}
        <Route path="/dev/projects" element={user ? <DevProjectsPage setIsModalOpen={setIsModalOpen} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
