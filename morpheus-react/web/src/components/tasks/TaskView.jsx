// src/components/tasks/TaskView.jsx
import React, { useState } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import List from "./List";
import TaskManagement from "./TaskManagement";

export default function TaskView({ projectId }) {
  const [viewMode, setViewMode] = useState("task"); // "user" 또는 "task"

  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setViewMode(newView);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>태스크 관리</Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewChange}
          aria-label="보기 모드"
          size="small"
          sx={{ 
            '& .MuiToggleButton-root': {
              fontSize: { xs: '0.7rem', sm: '0.875rem', md: '0.875rem' },
              px: { xs: 1, sm: 1.5, md: 2 },
            }
          }}
        >
          <ToggleButton value="user" aria-label="사용자별 보기">
            사용자별 보기
          </ToggleButton>
          <ToggleButton value="task" aria-label="태스크별 보기">
            태스크별 보기
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === "user" ? (
        <List projectId={projectId} />
      ) : (
        <TaskManagement projectId={projectId} />
      )}
    </Box>
  );
}

