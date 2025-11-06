// src/pages/AIadvisorPage.jsx
import React from "react";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import useAuth from "../hooks/useAuth";
import AdvisorCard from "../components/ui/AdvisorCard";

export default function AIadvisorPage() {
  useAuth(); // 로그인 체크

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      <Header title="AI Advisor" />

      <div className="p-4 space-y-8">
        <h2 className="text-lg font-bold mb-2 text-center">AI Advisor</h2>
        

        {/* Advisor Card */}
        <AdvisorCard />
      </div>

      <NavBar />
    </div>
  );
}
