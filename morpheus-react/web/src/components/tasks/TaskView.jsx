// src/components/tasks/TaskView.jsx
import React, { useState } from "react";
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import List from "./List";
import TaskManagement from "./TaskManagement";

export default function TaskView({ projectId }) {
  const [viewMode, setViewMode] = useState("user"); // "user" 또는 "task"

  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setViewMode(newView);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mb: 3 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewChange}
          aria-label="보기 모드"
          size="small"
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

