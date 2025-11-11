// src/components/Project/task/TaskList.jsx
import React, { useEffect, useState } from "react";
import { Box, Typography, Stack, Avatar, AvatarGroup, Button, TextField, CircularProgress, Card, CardContent } from "@mui/material";
import { getTasksByProject, createTask, updateTaskStatus, deleteTask } from "../../../api/task";
import { getUser } from "../../../utils/auth";

export default function ProjectTaskList({ projectId }) {
  const currentUser = getUser();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  // 테스크 불러오기
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await getTasksByProject(projectId);
      if (res?.success) {
        setTasks(res.data.tasks || []);
      } else {
        console.error("작업 조회 실패:", res.error);
      }
    } catch (err) {
      console.error("작업 조회 에러:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchTasks();
  }, [projectId]);

  // 새 작업 추가
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setCreatingTask(true);
    try {
      const res = await createTask(projectId, { title: newTaskTitle });
      if (res.success) {
        setNewTaskTitle("");
        fetchTasks();
      } else alert("작업 생성 실패");
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingTask(false);
    }
  };

  // 작업 완료 토글
  const handleToggleComplete = async (taskId, currentStatus) => {
    try {
      const res = await updateTaskStatus(taskId, !currentStatus);
      if (res.success) fetchTasks();
      else alert("작업 상태 변경 실패");
    } catch (err) {
      console.error(err);
    }
  };

  // 작업 삭제
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await deleteTask(taskId);
      if (res.success) fetchTasks();
      else alert("삭제 실패");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Card sx={{ borderRadius: 2, mt: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>작업 목록</Typography>

        {/* 새 작업 추가 */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="새 작업 입력"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <Button variant="contained" onClick={handleCreateTask} disabled={creatingTask}>
            {creatingTask ? <CircularProgress size={20} /> : "추가"}
          </Button>
        </Stack>

        {/* 작업 리스트 */}
        <Stack spacing={1}>
          {tasks.length === 0 && <Typography color="text.secondary">작업이 없습니다.</Typography>}
          {tasks.map((task) => (
            <Box
              key={task.id}
              sx={{
                p: 2,
                border: "1px solid #ddd",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: task.completed ? "grey.100" : "white",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  sx={{
                    textDecoration: task.completed ? "line-through" : "none",
                    color: task.completed ? "grey.600" : "black",
                  }}
                >
                  {task.title}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" onClick={() => handleToggleComplete(task.id, task.completed)}>
                  {task.completed ? "취소" : "완료"}
                </Button>
                <Button size="small" variant="outlined" color="error" onClick={() => handleDeleteTask(task.id)}>
                  삭제
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
