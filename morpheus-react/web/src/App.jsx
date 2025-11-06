import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/MainPage";
import AIadvisorPage from "./pages/AIadvisorPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import AINextStepPage from "./pages/AINextStepPage";
import NormalNextStepPage from "./pages/NormalNextStepPage";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* '/'와 '/login' 둘 다 로그인 페이지로 연결 */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* 로그인 상태 체크는 각 페이지에서 useAuth Hook으로 처리 */}
        <Route path="/main" element={<MainPage />} />
        <Route path="/aiadvisor" element={<AIadvisorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* AIadvisor 선택 옵션에 따른 페이지 */}
        <Route path="/ai-next-step" element={<AINextStepPage />} />
        <Route path="/normal-next-step" element={<NormalNextStepPage />} />
      </Routes>
    </Router>
  );
}
