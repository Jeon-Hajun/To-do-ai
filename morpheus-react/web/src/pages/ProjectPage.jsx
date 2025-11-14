import React from "react";
import ProjectManager from "../components/projects/ProjectManager";
import { Header, NavBar, ContainerBox, PageContainer } from "../components/layout";

export default function ProjectPage() {
  return (
    <ContainerBox>
      <Header title="Project" />

      <PageContainer
        title="프로젝트"
        subtitle="팀 협업용 프로젝트를 확인하고 관리하세요."
        maxWidth="md"
        sx={{ flex: 1, pt: 4 }}
      >
        <ProjectManager />
      </PageContainer>

      <NavBar />
    </ContainerBox>
  );
}
