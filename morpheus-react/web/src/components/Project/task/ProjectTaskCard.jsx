// src/components/Project/task/TaskCard.jsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from "@mui/material";
import { updateTaskStatus } from "../../../api/task";

export default function ProjectTaskCard({ task, members, currentUser, onDelete, onEdit, onStatusUpdated }) {
  const [status, setStatus] = useState(task.status);
  const [updating, setUpdating] = useState(false);

  const assignedUser = members.find(m => String(m.id) === String(task.assignedUserId));
  const owner = members.find(m => m.role === "owner");
  const isOwner = owner && String(owner.id) === String(currentUser?.id);
  const isAssignee = assignedUser && String(assignedUser.id) === String(currentUser?.id);

  const handleStatusChange = async (newStatus) => {
    if (status === newStatus) return;
    setUpdating(true);
    try {
      const res = await updateTaskStatus(task.id, newStatus);
      if (res.success) {
        setStatus(newStatus);
        onStatusUpdated?.();
      } else {
        alert("상태 변경 실패");
      }
    } catch (err) {
      console.error("상태 변경 실패:", err);
      alert("상태 변경 실패: 서버 오류");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid #ddd",
        borderRadius: 1,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        bgcolor: task.completed ? "#f0f0f0" : "white",
      }}
    >
      <Stack spacing={1}>
        <Typography sx={{ textDecoration: task.completed ? "line-through" : "none", fontWeight: 500 }}>
          {task.title}
        </Typography>

        {assignedUser && (
          <Typography variant="body2" color="text.secondary">
            담당자: {assignedUser.nickname || assignedUser.name || assignedUser.email}
          </Typography>
        )}

        {task.dueDate && (
          <Typography variant="body2" color="text.secondary">
            마감일: {new Date(task.dueDate).toLocaleDateString()}
          </Typography>
        )}

        {task.description && (
          <Typography variant="body2" color="text.secondary">
            설명: {task.description}
          </Typography>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          현재 상태: {status}
        </Typography>

        {isAssignee && (
          <FormControl fullWidth sx={{ mt: 0.5 }}>
            <InputLabel shrink sx={{ backgroundColor: "white", px: 0.5 }} id={`status-label-${task.id}`}>
              상태 변경
            </InputLabel>
            <Select
              labelId={`status-label-${task.id}`}
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updating}
            >
              <MenuItem value="todo">Todo</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="done">Done</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        )}
      </Stack>

      {isOwner && (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => onEdit(task)}>
            수정
          </Button>
          <Button size="small" variant="outlined" color="error" onClick={() => onDelete(task.id)}>
            삭제
          </Button>
        </Stack>
      )}
    </Box>
  );
}
