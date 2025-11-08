// src/pages/MainPage.jsx
import React from "react";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import TaskList from "../components/TaskList";
import ContainerBox from "../components/ui/ContainerBox";
import PageContainer from "../components/ui/PageContainer";

export default function MainPage() {
  return (
    <ContainerBox sx={{ bgcolor: "grey.100", pb: 8 }}>
      {/* Header */}
      <Header title="Home" />

      {/* 페이지 콘텐츠 */}
      <PageContainer title="Home">
        <div style={{ marginTop: 24 }}>
          <TaskList />
        </div>
      </PageContainer>

      {/* NavBar */}
      <NavBar />
    </ContainerBox>
  );
}
