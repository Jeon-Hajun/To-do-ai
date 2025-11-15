// src/components/tasks/TaskAdd.jsx
import React, { useState, useEffect } from "react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTask } from "../../api/tasks";
import { useAuthContext } from "../../context/AuthContext";
import { normalizeStatus } from "../../utils/taskStatus";

export default function TaskAdd({ open, onClose, projectId, members, editingTask, onSave, onDelete, defaultAssignedUserId, onCreate }) {
  const { user: currentUser } = useAuthContext();
  const queryClient = useQueryClient();
  const isEditMode = !!editingTask;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("todo");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [dueDateError, setDueDateError] = useState(false);

  // 편집 모드일 때 초기값 설정
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || "");
      setDescription(editingTask.description || "");
      setDueDate(editingTask.dueDate ? editingTask.dueDate.split("T")[0] : "");
      setStatus(normalizeStatus(editingTask.status) || "todo");
      setAssignedUserId(editingTask.assignedUserId || "");
    } else {
      setTitle("");
      setDescription("");
      setDueDate("");
      setStatus("todo");
      setAssignedUserId(defaultAssignedUserId || "");
      setDueDateError(false);
    }
  }, [editingTask, defaultAssignedUserId]);

  const mutation = useMutation({
    mutationFn: (taskData) => createTask(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setTitle("");
      setDescription("");
      setDueDate("");
      setStatus("todo");
      setAssignedUserId("");
      setDueDateError(false);
      onClose?.();
    },
    onError: (error) => {
      alert(error.message || "작업 생성 실패");
    }
  });

  const handleCreate = async () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요");
      return;
    }

    if (!dueDate) {
      setDueDateError(true);
      return;
    }

    const taskData = {
      projectId,
      title,
      description,
      dueDate: dueDate || null,
      assignedUserId: assignedUserId || null,
      status,
    };

    if (onCreate) {
      await onCreate(taskData);
    } else {
      mutation.mutate(taskData);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요");
      return;
    }

    if (!dueDate) {
      setDueDateError(true);
      return;
    }

    if (onSave) {
      await onSave({
        title,
        description,
        dueDate,
        status,
        assignedUserId: assignedUserId || null,
      });
    }
  };

  const handleDelete = () => {
    if (onDelete && editingTask) {
      if (window.confirm("정말 삭제하시겠습니까?")) {
        onDelete(editingTask.id);
      }
    }
  };

  // 모달 모드일 때만 open 체크
  if (!isEditMode && !open) return null;

  const content = (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {isEditMode ? "작업 수정" : "새 작업 추가"}
      </Typography>

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
          rows={5}
          margin="normal"
          placeholder="예시 형식:&#10;&#10;## 목표&#10;이 작업의 목표와 기대 결과를 설명해주세요.&#10;&#10;## 상세 내용&#10;작업의 구체적인 내용과 방법을 작성해주세요.&#10;&#10;## 참고사항&#10;- 체크리스트 항목 1&#10;- 체크리스트 항목 2&#10;&#10;## 관련 정보&#10;관련 문서나 링크가 있다면 추가해주세요."
          helperText="마크다운 형식을 사용할 수 있습니다. 제목(#), 리스트(-), 코드(`) 등을 활용해보세요."
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

        {/* 편집 모드일 때만 상태 선택 가능 */}
        {isEditMode && (
          <FormControl fullWidth margin="normal">
            <InputLabel>상태</InputLabel>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="todo">Todo</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="done">Done</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
        {isEditMode && onDelete && (
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
          >
            삭제
          </Button>
        )}
        <Button onClick={onClose}>취소</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={isEditMode ? handleSave : handleCreate}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <CircularProgress size={20} /> : (isEditMode ? "저장" : "추가")}
        </Button>
      </Box>
    </Box>
  );

  // 편집 모드이거나 모달이 아닐 때는 인라인으로 표시
  if (isEditMode || !open) {
    return content;
  }

  // 모달 모드일 때
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
        {content}
      </Box>
    </Modal>
  );
}

