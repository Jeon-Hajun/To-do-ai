//http://localhost:3000/dev/projects 절대 지우지
import React from "react";
import { Box } from "@mui/material";
import useAuth from "../../hooks/useAuth";
import Header from "../../components/ui/Header";
import NavBar from "../../components/ui/NavBar";
import ContainerBox from "../../components/ui/ContainerBox";
import PageContainer from "../../components/ui/PageContainer";
import Button from "../../components/ui/Button";
import { ProjectManager } from "../../components/Project";

export default function DevProjectsPage() {
  useAuth();

  return (
    <ContainerBox>
      <Header title="Dev Project" />

      <PageContainer
        title="개발자용 프로젝트 관리"
        subtitle="프로젝트 생성, 편집, 프로그레스 바 조정 가능"
        maxWidth="md"
        sx={{ flex: 1, pt: 4 }}
      >
        <ProjectManager
          renderHeader={(openModal) => (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button onClick={openModal}>프로젝트 생성</Button>
            </Box>
          )}
          devMode={true} // 개발자 모드
        />
      </PageContainer>

      <NavBar />
    </ContainerBox>
  );
}
