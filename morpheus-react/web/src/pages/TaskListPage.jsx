// src/pages/TaskListPage.jsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { List } from "../components/tasks";
import { Button, Box } from "@mui/material";

export default function TaskListPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <List projectId={projectId} />
      
      {/* 프로젝트 목록으로 돌아가기 버튼 */}
      <Button
        variant="outlined"
        onClick={() => navigate("/projects")}
        sx={{ mt: 2 }}
      >
        ← 프로젝트 목록으로 돌아가기
      </Button>
    </Box>
  );
}
