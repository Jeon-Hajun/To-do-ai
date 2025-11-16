import React from "react";
import ProjectManager from "../components/projects/ProjectManager";
import { Header, ContainerBox, PageContainer } from "../components/layout/index.js";

export default function ProjectPage() {
  return (
    <ContainerBox>
      <Header title="Project" />

      <PageContainer
        title="프로젝트"
        maxWidth="md"
        sx={{ flex: 1, pt: 4 }}
      >
        <ProjectManager />
      </PageContainer>
    </ContainerBox>
  );
}
