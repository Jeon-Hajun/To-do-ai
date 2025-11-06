// src/pages/MainPage.jsx
import React from "react";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import useAuth from "../hooks/useAuth";
import TaskList from "../components/TaskList"; // 추가

export default function MainPage() {
  useAuth(); // 로그인 체크

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      <Header title="Home" />

      {/* TaskList 렌더링 */}
      <div className="p-4">
        <h2 className="text-lg font-bold mb-2">메인 페이지</h2>
        <TaskList />
      </div>

      <NavBar />
    </div>
  );
}
