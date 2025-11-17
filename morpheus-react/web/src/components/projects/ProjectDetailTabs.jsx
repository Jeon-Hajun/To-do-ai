import React, { useState, useEffect } from "react";
import { Card, CardContent, Box, Button, CircularProgress, Typography } from "@mui/material";
import ProjectDetailCard from "./ProjectDetailCard";
import TaskView from "../tasks/TaskView";
import ProjectGitHubTab from "../GitHub/ProjectGitHubTab";
import { useParams } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { useProjectDetail } from "../../hooks/useProjectDetail";

export default function ProjectDetailTabs() {
  const { projectId } = useParams();
  const { project, members, loading } = useProjectDetail(projectId);
  const [activeTab, setActiveTab] = useState("detail"); // "detail" / "task" / "github"

  if (loading)
    return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;

  if (!project)
    return (
      <Typography sx={{ mt: 4, textAlign: "center" }}>
        프로젝트를 찾을 수 없습니다.
      </Typography>
    );

  return (
    <Box sx={{ maxWidth: { xs: "100%", md: 800 }, margin: "auto", mt: { xs: 2, md: 4 } }}>
      <Card sx={{ p: 0, borderRadius: 2, overflow: "hidden" }}>
        {/* 탭 버튼 */}
        <Box sx={{ display: "flex", borderBottom: 1, borderColor: "divider" }}>
          <Button
            onClick={() => setActiveTab("detail")}
            sx={{
              flex: 1,
              borderRadius: 0,
              bgcolor: activeTab === "detail" ? "primary.main" : "transparent",
              color: activeTab === "detail" ? "white" : "text.primary",
              fontWeight: activeTab === "detail" ? "bold" : 500,
              fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
              py: { xs: 1, md: 1.5 },
              "&:hover": {
                bgcolor: activeTab === "detail" ? "primary.dark" : "action.hover",
              },
            }}
          >
            상세 정보
          </Button>
          <Button
            onClick={() => setActiveTab("task")}
            sx={{
              flex: 1,
              borderRadius: 0,
              bgcolor: activeTab === "task" ? "primary.main" : "transparent",
              color: activeTab === "task" ? "white" : "text.primary",
              fontWeight: activeTab === "task" ? "bold" : 500,
              fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
              py: { xs: 1, md: 1.5 },
              "&:hover": {
                bgcolor: activeTab === "task" ? "primary.dark" : "action.hover",
              },
            }}
          >
            Tasks
          </Button>
          <Button
            onClick={() => setActiveTab("github")}
            sx={{
              flex: 1,
              borderRadius: 0,
              bgcolor: activeTab === "github" ? "primary.main" : "transparent",
              color: activeTab === "github" ? "white" : "text.primary",
              fontWeight: activeTab === "github" ? "bold" : 500,
              fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
              py: { xs: 1, md: 1.5 },
              "&:hover": {
                bgcolor: activeTab === "github" ? "primary.dark" : "action.hover",
              },
            }}
          >
            GitHub
          </Button>
        </Box>

        <CardContent sx={{ pt: { xs: 2, md: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
          {activeTab === "detail" && (
            <ProjectDetailCard projectId={projectId} showTaskList={false} />
          )}
          {activeTab === "task" && <TaskView projectId={projectId} />}
          {activeTab === "github" && (
            <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
              <ProjectGitHubTab 
                projectId={projectId} 
                githubRepo={project.githubRepo || project.github_repo}
                hasGithubToken={project.hasGithubToken || false}
                isOwner={true}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

