// src/components/Project/ProjectDetailTabs.jsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, Box, Button, CircularProgress, Typography } from "@mui/material";
import ProjectDetailCard from "./ProjectDetailCard";
import ProjectTaskList from "./task/ProjectTaskList";
import { useParams } from "react-router-dom";
import { useProject } from "../../context/ProjectContext";

export default function ProjectDetailTabs() {
  const { id } = useParams(); // URL에서 projectId 가져오기
  const { projects, currentProject, loading, isOwner } = useProject();
  const [activeTab, setActiveTab] = useState("detail"); // "detail" / "task"

  // URL에 맞는 프로젝트 찾기 (context 기반)
  const activeProject = projects.find(p => String(p.id) === String(id)) || currentProject;

  if (loading)
    return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;

  if (!activeProject)
    return (
      <Typography sx={{ mt: 4, textAlign: "center" }}>
        프로젝트를 찾을 수 없습니다.
      </Typography>
    );

  return (
    <Box sx={{ maxWidth: 800, margin: "auto", mt: 4 }}>
      <Card sx={{ p: 0, borderRadius: 2, overflow: "hidden" }}>
        {/* 탭 버튼 */}
        <Box sx={{ display: "flex", borderBottom: 1, borderColor: "divider" }}>
          <Button
            onClick={() => setActiveTab("detail")}
            sx={{
              flex: 1,
              borderRadius: 0,
              bgcolor: activeTab === "detail" ? "primary.main" : "grey.100",
              color: activeTab === "detail" ? "white" : "black",
              fontWeight: activeTab === "detail" ? "bold" : 500,
            }}
          >
            상세 정보
          </Button>
          <Button
            onClick={() => setActiveTab("task")}
            sx={{
              flex: 1,
              borderRadius: 0,
              bgcolor: activeTab === "task" ? "primary.main" : "grey.100",
              color: activeTab === "task" ? "white" : "black",
              fontWeight: activeTab === "task" ? "bold" : 500,
            }}
          >
            작업 목록
          </Button>
        </Box>

        <CardContent sx={{ pt: 3 }}>
          {activeTab === "detail" && (
            <ProjectDetailCard project={activeProject} isOwner={isOwner} />
          )}
          {activeTab === "task" && <ProjectTaskList projectId={activeProject.id} />}
        </CardContent>
      </Card>
    </Box>
  );
}
