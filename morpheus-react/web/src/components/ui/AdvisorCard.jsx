import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "./Button";

export default function AdvisorCard() {
  const [selectedOption, setSelectedOption] = useState(null);
  const navigate = useNavigate();

  const descriptions = {
    option1: "옵션 1을 선택하셨습니다. 이 옵션은 A 기능에 적합합니다.",
    option2: "옵션 2를 선택하셨습니다. 이 옵션은 B 기능에 적합합니다.",
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* 설명 영역 */}
      <div className="mb-6 text-gray-700">
        {selectedOption
          ? descriptions[selectedOption]
          : "원하는 옵션을 선택하면 설명이 표시됩니다."}
      </div>

      {/* 선택 버튼 */}
      <div className="flex gap-4 mb-4 w-full">
        <Button
          type="select"
          selected={selectedOption === "option1"}
          onClick={() => setSelectedOption("option1")}
          className="flex-1 w-full"
        >
          AI 기반 추천, 분석
        </Button>

        <Button
          type="select"
          selected={selectedOption === "option2"}
          onClick={() => setSelectedOption("option2")}
          className="flex-1 w-full"
        >
          일반 템플릿 활용
        </Button>
      </div>

      {/* 계속하기 버튼 */}
      <div className="flex justify-center">
        <Button
          type="default"
          className={`w-full max-w-md ${!selectedOption ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={!selectedOption}
          onClick={() => {
            if (selectedOption === "option1") {
              navigate("/ai-next-step");
            } else if (selectedOption === "option2") {
              navigate("/normal-next-step");
            }
          }}
        >
          계속하기
        </Button>
      </div>
    </div>
  );
}
