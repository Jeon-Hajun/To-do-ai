// src/components/tasks/TaskCard.jsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTaskStatus } from "../../api/tasks";
import { useAuthContext } from "../../context/AuthContext";
import { normalizeStatus, getStatusDisplay } from "../../utils/taskStatus";

export default function TaskCard({
  task,
  members,
  projectId,
  draggable = true,
  onDragStart,
}) {
  const { user: currentUser } = useAuthContext();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(normalizeStatus(task.status));

  const assignedUser = members?.find((m) => String(m.id) === String(task.assignedUserId));
  const isAssignee = assignedUser && String(assignedUser.id) === String(currentUser?.id);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateTaskStatus({ id, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
    onError: (error) => {
      alert(error.message || "상태 변경 실패");
    }
  });

  const handleStatusChange = async (newStatus) => {
    if (status === newStatus) return;
    setStatus(newStatus);
    statusMutation.mutate({ id: task.id, status: newStatus });
  };

  const handleDragStart = (e) => {
    if (onDragStart) {
      onDragStart(e, task);
    } else {
      e.dataTransfer.setData("application/json", JSON.stringify(task));
      e.dataTransfer.effectAllowed = "move";
    }
  };

  // 상태에 따른 카드 색상
  let cardBg = "white";
  if (status === "done") cardBg = "#8dfc71ff"; // 연두
  if (status === "cancelled") cardBg = "#e6695eff"; // 빨강

  return (
    <Box
      draggable={draggable}
      onDragStart={handleDragStart}
      sx={{
        p: 2,
        border: "1px solid #ddd",
        borderRadius: 1,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        bgcolor: cardBg,
        cursor: draggable ? "grab" : "default",
        transition: "background-color 0.3s",
        "&:active": {
          cursor: draggable ? "grabbing" : "default",
        },
      }}
    >
      <Stack spacing={1}>
        <Typography sx={{ textDecoration: task.completed ? "line-through" : "none", fontWeight: 500 }}>
          {task.title}
        </Typography>

        {task.dueDate && (
          <Typography variant="body2" color="text.secondary">
            마감일: {new Date(task.dueDate).toLocaleDateString()}
          </Typography>
        )}

        <Typography variant="body2" color="text.secondary">
          현재 상태: {getStatusDisplay(status)}
        </Typography>

        {isAssignee && (
          <FormControl fullWidth sx={{ mt: 0.5 }}>
            <InputLabel
              shrink
              sx={{ backgroundColor: cardBg, px: 0.5 }}
              id={`status-label-${task.id}`}
            >
              상태 변경
            </InputLabel>
            <Select
              labelId={`status-label-${task.id}`}
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusMutation.isPending}
            >
              <MenuItem value="todo">Todo</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="done">Done</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        )}
      </Stack>
    </Box>
  );
}

