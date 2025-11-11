// src/components/Project/task/ProjectTaskAdd.jsx
import React, { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress
} from "@mui/material";
import { createTask } from "../../../api/task";
import { getUser } from "../../../utils/auth";

export default function ProjectTaskAdd({ open, onClose, projectId, members, onCreated }) {
  const currentUser = getUser();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("todo");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [creating, setCreating] = useState(false);

  const [dueDateError, setDueDateError] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요");
      return;
    }

    if (!dueDate) {
      setDueDateError(true);
      return;
    }

    setCreating(true);
    try {
      const res = await createTask(projectId, {
        title,
        description,
        dueDate: dueDate || null,
        assignedUserId: assignedUserId || null,
        status
      });

      if (res.success) {
        setTitle("");
        setDescription("");
        setDueDate("");
        setStatus("todo");
        setAssignedUserId("");
        setDueDateError(false);
        onCreated?.();
        onClose?.();
      } else {
        alert("작업 생성 실패");
      }
    } catch (err) {
      console.error("작업 생성 실패:", err);
      alert("작업 생성 실패: 서버 오류");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: 400 },
          maxHeight: "90vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 2,
          p: 3,
          boxShadow: 24
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>새 작업 추가</Typography>

        <TextField
          label="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          margin="normal"
        />

        <TextField
          label="설명"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={3}
          margin="normal"
        />

        <TextField
          label="마감일"
          type="date"
          value={dueDate}
          onChange={(e) => {
            setDueDate(e.target.value);
            if (e.target.value) setDueDateError(false);
          }}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          error={dueDateError}
          helperText={dueDateError ? "날짜를 입력해주세요" : ""}
        />

        {members?.length > 1 && (
          <FormControl fullWidth margin="normal">
            <InputLabel>담당자</InputLabel>
            <Select
              value={assignedUserId || ""}
              onChange={(e) => setAssignedUserId(e.target.value)}
            >
              <MenuItem value="">없음</MenuItem>
              {members.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.nickname || m.email || m.name || m.username || "이름 없음"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl fullWidth margin="normal">
          <InputLabel>상태</InputLabel>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="todo">Todo</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="done">Done</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button onClick={onClose} sx={{ mr: 1 }}>취소</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? <CircularProgress size={20} /> : "추가"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
