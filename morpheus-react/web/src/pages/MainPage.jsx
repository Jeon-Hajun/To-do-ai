// src/pages/MainPage.jsx
import React from "react";
import useAuth from "../hooks/useAuth";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import TaskList from "../components/TaskList";
import ContainerBox from "../components/ui/ContainerBox";
import PageContainer from "../components/ui/PageContainer";

export default function MainPage() {
  const { user, loading } = useAuth(); // 로그인 체크 + 사용자 반환

  // 로딩 중에는 아무것도 렌더링하지 않음
  if (loading) return null;

  // 로그인 안 되어 있으면 메시지나 간단한 UI만 보여주고
  // Navigate는 LogoutButton에서만 처리
  if (!user) {
    return (
      <ContainerBox sx={{ bgcolor: "grey.100", pb: 8 }}>
        <Header title="Home" />
        <PageContainer title="Home" subtitle="로그인이 필요합니다.">
          <div style={{ marginTop: 24 }}>
            {/* 로그인 안내 메시지 */}
            <p>로그인이 필요합니다. 로그인 페이지로 이동해주세요.</p>
          </div>
        </PageContainer>
        <NavBar />
      </ContainerBox>
    );
  }

  return (
    <ContainerBox sx={{ bgcolor: "grey.100", pb: 8 }}>
      <Header title="Home" />
      <PageContainer title="Home" subtitle="환영합니다! 오늘 할 일을 확인해보세요.">
        <div style={{ marginTop: 24 }}>
          <TaskList />
        </div>
      </PageContainer>
      <NavBar />
    </ContainerBox>
  );
}
