// src/components/Project/task/ProjectTaskEdit.jsx
import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from "@mui/material";
import { updateTask, updateTaskStatus, updateTaskAssignee } from "../../../api/task";
import { getUser } from "../../../utils/auth";

export default function ProjectTaskEdit({ open, onClose, task, members, onUpdated }) {
  const currentUser = getUser();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("todo");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // 날짜 검증 상태
  const [dueDateError, setDueDateError] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
      setStatus(task.status || "todo");
      setAssignedUserId(task.assignedUserId || "");

      const owner = members.find((m) => m.role === "owner");
      setIsOwner(owner ? String(owner.id) === String(currentUser.id) : false);
    }
  }, [task, members, currentUser.id]);

  const handleSave = async () => {
    if (!task) return;

    // 날짜 검증
    if (!dueDate) {
      setDueDateError(true);
      return;
    } else {
      setDueDateError(false);
    }

    setSaving(true);
    try {
      const resUpdate = await updateTask(task.id, { title, description, dueDate });
      if (!resUpdate.success) throw new Error(resUpdate.error.message);

      const resStatus = await updateTaskStatus(task.id, status);
      if (!resStatus.success) throw new Error(resStatus.error.message);

      if (isOwner && assignedUserId !== task.assignedUserId) {
        const resAssign = await updateTaskAssignee(task.id, assignedUserId || null);
        if (!resAssign.success) throw new Error(resAssign.error.message);
      }

      onUpdated?.();
      onClose?.();
    } catch (err) {
      console.error("작업 저장 실패:", err.message);
      alert(`작업 저장 실패: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!task) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: 500 },
          maxHeight: "90vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 2,
          p: 4,
          boxShadow: 24
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          작업 수정
        </Typography>

        <TextField
          label="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />

        <TextField
          label="설명"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={3}
          sx={{ mb: 2 }}
        />

        <TextField
          label="마감일"
          type="date"
          value={dueDate || ""}
          onChange={(e) => setDueDate(e.target.value)}
          fullWidth
          sx={{ mb: 1 }}
          InputLabelProps={{ shrink: true }}
          error={dueDateError}
          helperText={dueDateError ? "날짜를 입력해주세요." : ""}
        />

        {isOwner && members?.length > 0 && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>담당자</InputLabel>
            <Select
              value={assignedUserId || ""}
              onChange={(e) => setAssignedUserId(e.target.value || null)}
              label="담당자"
            >
              <MenuItem value="">없음</MenuItem>
              {members.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.nickname || m.email || "이름 없음"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>상태</InputLabel>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} label="상태">
            <MenuItem value="todo">Todo</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="done">Done</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : "저장"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
