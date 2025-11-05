import React from "react";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import LogoutButton from "../components/ui/LogoutButton";
import useAuth from "../hooks/useAuth";

export default function ProfilePage() {
  useAuth(); // 로그인 체크

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      <Header title="Profile" />
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-bold">프로필</h2>
        <p>사용자 정보와 계정 설정을 여기에 표시하세요.</p>

        <LogoutButton />
      </div>
      <NavBar />
    </div>
  );
}
