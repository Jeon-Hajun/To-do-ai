import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, CircularProgress, Stack, Button } from "@mui/material";
import { Header, NavBar, ContainerBox } from "../components/layout";
import ProjectDetailTabs from "../components/projects/ProjectDetailTabs";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <ContainerBox sx={{ minHeight: "100vh", pb: 8 }}>
      <Header title="프로젝트 상세" />

      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <Button variant="outlined" onClick={() => navigate("/projects")}>
            프로젝트 목록
          </Button>
        </Stack>

        <ProjectDetailTabs />
      </Box>

      <NavBar />
    </ContainerBox>
  );
}
