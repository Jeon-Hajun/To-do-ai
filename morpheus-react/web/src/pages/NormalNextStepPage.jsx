import React, { useState } from "react";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import Button from "../components/ui/Button";
import useAuth from "../hooks/useAuth";

export default function NormalNextStepPage() {
  useAuth();
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="min-h-screen bg-gray-100 pb-16 flex flex-col">
      <Header title="Normal Next Step" />

      <div className="flex-grow p-4">
        <h2 className="text-lg font-bold mb-4">일반 템플릿 다음 단계 페이지</h2>
        <p className="mb-6">여기에 일반 템플릿 기반 결과나 추가 기능을 표시할 수 있습니다.</p>


        <div className="flex justify-center mt-6">
          <Button type="back">뒤로가기</Button>
        </div>
      </div>

      <NavBar />
    </div>
  );
}
