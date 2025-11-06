import React from "react";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import useAuth from "../hooks/useAuth";

export default function SettingsPage() {
  useAuth(); // 로그인 체크

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      <Header title="Settings" />
      <div className="p-4">
        <h2 className="text-lg font-bold mb-2">설정</h2>
        <p>설정 관련 UI를 여기에 추가하세요.</p>
      </div>
      <NavBar />
    </div>
  );
}
