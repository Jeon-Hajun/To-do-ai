import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import ContainerBox from "../components/ui/ContainerBox";
import PageContainer from "../components/ui/PageContainer";
import Button from "../components/ui/Button"; // 커스텀 Button 모듈

export default function AINextStepPage() {
  useAuth(); // 로그인 체크
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");

  return (
    <ContainerBox>
      {/* Header */}
      <Header title="AI Next Step" />

      {/* 페이지 콘텐츠 영역 */}
      <PageContainer
        title="AI 기반 다음 단계 페이지"
        subtitle="여기에 AI 기반 추천 결과나 추가 기능을 표시할 수 있습니다."
        maxWidth="sm"
        sx={{ flex: 1, pt: 4 }}
      >
        {/* 뒤로가기 버튼 */}
        <Button
          onClick={() => navigate(-1)}
          sx={{ mt: 6, alignSelf: "center" }}
        >
          뒤로가기
        </Button>
      </PageContainer>

      {/* NavBar */}
      <NavBar />
    </ContainerBox>
  );
}
