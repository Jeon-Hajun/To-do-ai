// src/pages/ProjectDetailPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getProjects, getMembers } from "../api/projects";
import { getUser } from "../utils/auth";
import { Box, CircularProgress, Stack } from "@mui/material";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import Button from "../components/ui/Button";
import ProjectDetailTabs from "../components/Project/ProjectDetailTabs"; // 탭 컴포넌트

export default function ProjectDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getUser();

  const projectFromState = location.state?.project;

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        let allProjects = [];

        if (projectFromState) {
          allProjects.push(projectFromState);
        } else {
          const res = await getProjects();
          if (!res.success) throw new Error("프로젝트 불러오기 실패");
          allProjects = res.data.projects;
        }

        // 각 프로젝트에 멤버 정보 추가
        const projectsWithMembers = await Promise.all(
          allProjects.slice(0, 3).map(async (proj) => {
            const memRes = await getMembers(proj.id);
            return {
              ...proj,
              members: memRes.success ? memRes.data.members : [],
            };
          })
        );

        setProjects(projectsWithMembers);
      } catch (err) {
        console.error(err);
        navigate("/project"); // 오류 시 목록으로 이동
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [location.pathname, projectFromState, navigate]);

  if (loading || projects.length === 0) return <CircularProgress />;

  return (
    <Box sx={{ bgcolor: "grey.100", minHeight: "100vh", pb: 8 }}>
      <Header title="프로젝트 상세" />
      
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <Button type="back" onClick={() => navigate("/project")}>
            프로젝트 목록
          </Button>
        </Stack>

        <ProjectDetailTabs projects={projects} />
      </Box>

      <NavBar />
    </Box>
  );
}
