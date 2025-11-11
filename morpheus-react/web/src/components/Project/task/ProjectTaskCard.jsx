// src/components/Project/task/ProjectTaskCard.jsx
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
  Collapse,
  CircularProgress,
} from "@mui/material";
import { updateTaskStatus, getTaskById } from "../../../api/task";

export default function ProjectTaskCard({
  task,
  members,
  currentUser,
  onDelete,
  onEdit,
  onStatusUpdated,
}) {
  const [status, setStatus] = useState(task.status);
  const [updating, setUpdating] = useState(false);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(task.description || "");
  const [loadingDescription, setLoadingDescription] = useState(false);

  const assignedUser = members.find((m) => String(m.id) === String(task.assignedUserId));
  const owner = members.find((m) => m.role === "owner");
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

  const toggleOpen = async () => {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);

    // description이 비어있으면 백엔드에서 가져오기
    if (!description) {
      setLoadingDescription(true);
      try {
        const res = await getTaskById(task.id);
        if (res.success) {
          setDescription(res.data.task.description || "설명 없음");
        } else {
          setDescription("설명 없음");
        }
      } catch (err) {
        console.error("상세 조회 실패:", err);
        setDescription("설명 없음");
      } finally {
        setLoadingDescription(false);
      }
    }
  };

  // 상태에 따른 카드 색상
  let cardBg = "white";
  if (status === "done") cardBg = "#8dfc71ff"; // 연두
  if (status === "cancelled") cardBg = "#e6695eff"; // 빨강

  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid #ddd",
        borderRadius: 1,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        bgcolor: cardBg,
        cursor: "pointer",
        transition: "background-color 0.3s",
      }}
      onClick={toggleOpen}
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

        <Typography variant="body2" color="text.secondary">
          현재 상태: {status}
        </Typography>

        {isAssignee && (
          <FormControl fullWidth sx={{ mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
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

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box
          sx={{
            mt: 1,
            p: 1,
            minHeight: 50,
            border: "1px solid #ccc",
            borderRadius: 1,
            bgcolor: "white",
            transition: "all 0.3s",
          }}
        >
          {loadingDescription ? (
            <CircularProgress size={20} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              {description || "설명 없음"}
            </Typography>
          )}

          {isOwner && (
            <Stack direction="row" spacing={1} mt={1}>
              <Button
                size="small"
                variant="contained"
                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              >
                수정
              </Button>
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              >
                삭제
              </Button>
            </Stack>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
