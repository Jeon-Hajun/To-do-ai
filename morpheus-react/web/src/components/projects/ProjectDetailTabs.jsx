import React, { useState, useEffect } from "react";
import { Card, CardContent, Box, Button, CircularProgress, Typography } from "@mui/material";
import ProjectDetailCard from "./ProjectDetailCard";
import { List } from "../tasks";
import ProjectGitHubTab from "../github/ProjectGitHubTab";
import { useParams } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { useProjectDetail } from "../../hooks/useProjectDetail";

export default function ProjectDetailTabs() {
  const { projectId } = useParams();
  const { user: currentUser } = useAuthContext();
  const { project, members, loading } = useProjectDetail(projectId);
  const [activeTab, setActiveTab] = useState("detail"); // "detail" / "task" / "github"
  const [isOwner, setIsOwner] = useState(false);

  // 현재 프로젝트의 isOwner 계산
  useEffect(() => {
    if (!project || !currentUser?.id) {
      setIsOwner(false);
      return;
    }

    const ownerId = project.ownerId || project.owner_id;
    setIsOwner(String(ownerId) === String(currentUser.id));
  }, [project?.id, project?.ownerId, currentUser?.id]);

  if (loading)
    return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;

  if (!project)
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
              bgcolor: activeTab === "detail" ? "primary.main" : "transparent",
              color: activeTab === "detail" ? "white" : "text.primary",
              fontWeight: activeTab === "detail" ? "bold" : 500,
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
              "&:hover": {
                bgcolor: activeTab === "task" ? "primary.dark" : "action.hover",
              },
            }}
          >
            List
          </Button>
          <Button
            onClick={() => setActiveTab("github")}
            sx={{
              flex: 1,
              borderRadius: 0,
              bgcolor: activeTab === "github" ? "primary.main" : "transparent",
              color: activeTab === "github" ? "white" : "text.primary",
              fontWeight: activeTab === "github" ? "bold" : 500,
              "&:hover": {
                bgcolor: activeTab === "github" ? "primary.dark" : "action.hover",
              },
            }}
          >
            GitHub
          </Button>
        </Box>

        <CardContent sx={{ pt: 3 }}>
          {activeTab === "detail" && (
            <ProjectDetailCard projectId={projectId} showTaskList={false} />
          )}
          {activeTab === "task" && <List projectId={projectId} />}
          {activeTab === "github" && (
            <Box sx={{ p: 3 }}>
              <ProjectGitHubTab 
                projectId={projectId} 
                githubRepo={project.githubRepo || project.github_repo}
                hasGithubToken={project.hasGithubToken || false}
                isOwner={isOwner}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

