import React from "react";
import useAuth from "../hooks/useAuth";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import ContainerBox from "../components/ui/ContainerBox";
import PageContainer from "../components/ui/PageContainer";
import LoggedInCard from "../components/LoggedInCard";

export default function SettingsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <ContainerBox>
        <PageContainer>
          로딩 중...
        </PageContainer>
      </ContainerBox>
    );
  }

  return (
    <ContainerBox>
      {/* Header */}
      <Header title="Settings" />

      {/* 페이지 콘텐츠 영역 */}
      <PageContainer
        title={user ? "계정 설정" : "로그인 필요"}
        subtitle={
          user
            ? "계정 설정을 여기에 표시하세요. 필요하면 테마, 알림 설정 등 추가 가능"
            : "로그인 후에 설정을 볼 수 있습니다."
        }
        maxWidth="sm"
        sx={{ flex: 1, pt: 4, display: "flex", flexDirection: "column", gap: 2 }}
      >
        {user && (
          <LoggedInCard email={user.email}>
            <PageContainer sx={{ mt: 2, flexDirection: "column", gap: 1 }}>
              이메일: {user.email}
              {/* 추가 설정 UI는 여기 추가 */}
            </PageContainer>
          </LoggedInCard>
        )}
      </PageContainer>

      {/* NavBar */}
      <NavBar />
    </ContainerBox>
  );
}
