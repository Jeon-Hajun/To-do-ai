// src/pages/ProjectPage.jsx
import React from "react";
import useAuth from "../hooks/useAuth";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import ContainerBox from "../components/ui/ContainerBox";
import PageContainer from "../components/ui/PageContainer";
import { ProjectManager } from "../components/Project";

export default function ProjectPage() {
  useAuth();

  return (
    <ContainerBox>
      <Header title="Project" />

      <PageContainer
        title="프로젝트"
        subtitle="팀 협업용 프로젝트를 확인하고 관리하세요."
        maxWidth="md"
        sx={{ flex: 1, pt: 4 }}
      >
        <ProjectManager devMode={false} />
      </PageContainer>

      <NavBar />
    </ContainerBox>
  );
}
