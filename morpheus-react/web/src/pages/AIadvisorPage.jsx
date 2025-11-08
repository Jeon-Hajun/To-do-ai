import React from "react";
import useAuth from "../hooks/useAuth";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import ContainerBox from "../components/ui/ContainerBox";
import PageContainer from "../components/ui/PageContainer";
import AdvisorCard from "../components/ui/AdvisorCard";

export default function AIadvisorPage() {
  useAuth(); // 로그인 체크

  return (
    <ContainerBox>
      {/* Header */}
      <Header title="AI Advisor" />

      {/* 페이지 콘텐츠 영역 */}
      <PageContainer
        title="AI Advisor"
        subtitle="AI 기반 추천, 분석, 조언 등을 표시합니다."
        maxWidth="sm"
        sx={{ flex: 1, pt: 4 }}
      >
        {/* AdvisorCard */}
        <AdvisorCard sx={{ mt: 4 }} />
      </PageContainer>

      {/* NavBar */}
      <NavBar />
    </ContainerBox>
  );
}
