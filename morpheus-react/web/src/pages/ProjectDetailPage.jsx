import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, CircularProgress, Stack, Button } from "@mui/material";
import { Header, ContainerBox } from "../components/layout/index.js";
import ProjectDetailTabs from "../components/projects/ProjectDetailTabs";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <ContainerBox sx={{ minHeight: "100vh", pb: 8 }}>
      <Header title="프로젝트 상세" />

      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent={{ xs: "stretch", sm: "flex-end" }} sx={{ mb: { xs: 1.5, md: 2 } }}>
          <Button variant="outlined" onClick={() => navigate("/projects")} fullWidth={{ xs: true, sm: false }}>
            프로젝트 목록
          </Button>
        </Stack>

        <ProjectDetailTabs />
      </Box>
    </ContainerBox>
  );
}
