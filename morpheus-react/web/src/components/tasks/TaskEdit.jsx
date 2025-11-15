// src/components/tasks/TaskEdit.jsx
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTask, updateTaskStatus, assignTask } from "../../api/tasks";
import { normalizeStatus } from "../../utils/taskStatus";

export default function TaskEdit({ open, onClose, task, members, onUpdated }) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("todo");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [dueDateError, setDueDateError] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
      setStatus(normalizeStatus(task.status) || "todo");
      setAssignedUserId(task.assignedUserId || "");
    }
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", task?.projectId] });
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateTaskStatus({ id, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", task?.projectId] });
    }
  });

  const assignMutation = useMutation({
    mutationFn: ({ taskId, assignedUserId }) => assignTask(taskId, assignedUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", task?.projectId] });
    }
  });

  const handleSave = async () => {
    if (!task) return;

    // 날짜 검증
    if (!dueDate) {
      setDueDateError(true);
      return;
    } else {
      setDueDateError(false);
    }

    try {
      // Task 정보 업데이트
      await updateMutation.mutateAsync({
        id: task.id,
        data: { title, description, dueDate }
      });

      // 상태 업데이트
      await statusMutation.mutateAsync({
        id: task.id,
        status
      });

      // 담당자 변경
      if (assignedUserId !== task.assignedUserId) {
        await assignMutation.mutateAsync({
          taskId: task.id,
          assignedUserId: assignedUserId || null
        });
      }

      if (onUpdated) {
        onUpdated();
      }
      onClose?.();
    } catch (err) {
      alert(`작업 저장 실패: ${err.message}`);
    }
  };

  if (!task) return null;

  const isSaving = updateMutation.isPending || statusMutation.isPending || assignMutation.isPending;

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
          rows={5}
          sx={{ mb: 2 }}
          placeholder="예시 형식:&#10;&#10;## 목표&#10;이 작업의 목표와 기대 결과를 설명해주세요.&#10;&#10;## 상세 내용&#10;작업의 구체적인 내용과 방법을 작성해주세요.&#10;&#10;## 참고사항&#10;- 체크리스트 항목 1&#10;- 체크리스트 항목 2&#10;&#10;## 관련 정보&#10;관련 문서나 링크가 있다면 추가해주세요."
          helperText="마크다운 형식을 사용할 수 있습니다. 제목(#), 리스트(-), 코드(`) 등을 활용해보세요."
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

        {members?.length > 0 && (
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
          <Button onClick={onClose} disabled={isSaving}>
            취소
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <CircularProgress size={20} /> : "저장"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

