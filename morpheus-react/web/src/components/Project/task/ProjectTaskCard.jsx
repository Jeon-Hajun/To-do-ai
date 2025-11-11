// src/components/Project/task/TaskCard.jsx
import React, { useEffect, useState } from "react";
import { Box, Typography, Stack, Button, CircularProgress, Card, CardContent } from "@mui/material";
import { getTasksByProject } from "../../../api/task";

export default function ProjectTaskCard({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await getTasksByProject(projectId);
        if (res?.success) {
          setTasks(res.data.tasks || []);
        } else {
          setError(res?.error?.message || "작업 조회 실패");
        }
      } catch (err) {
        setError(err.message || "작업 조회 실패");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchTasks();
  }, [projectId]);

  if (loading) return <CircularProgress sx={{ mt: 2 }} />;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Card sx={{ mt: 3, borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 2 }}>
          작업 목록
        </Typography>
        <Stack spacing={1}>
          {tasks.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              등록된 작업이 없습니다.
            </Typography>
          )}
          {tasks.map((task) => (
            <Box
              key={task.id}
              sx={{
                p: 2,
                border: "1px solid #ddd",
                borderRadius: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                bgcolor: "#fafafa",
                transition: "0.2s",
                "&:hover": { bgcolor: "#f0f0f0" },
              }}
            >
              <Typography>{task.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {task.status || "미완료"}
              </Typography>
            </Box>
          ))}
        </Stack>

        {/* 새 작업 추가 버튼 */}
        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="contained" color="primary">
            새 작업 추가
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
