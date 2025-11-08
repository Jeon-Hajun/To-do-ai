import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "./ui/Card"; // 우리가 만든 MUI Card
import { getTasks } from "../api/taskApi";

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, pending: 0 });

  useEffect(() => {
    const fetchTasks = async () => {
      const data = await getTasks();
      setTasks(data);

      const total = data.length;
      const completed = data.filter((t) => t.status === "완료").length;
      const inProgress = data.filter((t) => t.status === "진행 중").length;
      const pending = data.filter((t) => t.status === "대기 중").length;

      setStats({ total, completed, inProgress, pending });
    };

    fetchTasks();
  }, []);

  return (
    <Box sx={{ p: 2, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 2 }}>
      {/* 통계 카드 */}
      <Card sx={{ bgcolor: "blue.50" }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Task 통계
        </Typography>
        <Typography>총 작업: {stats.total}</Typography>
        <Typography>완료: {stats.completed}</Typography>
        <Typography>진행 중: {stats.inProgress}</Typography>
        <Typography>대기 중: {stats.pending}</Typography>
        {stats.total > 0 && (
          <Typography sx={{ mt: 1, fontWeight: "bold" }}>
            진행률: {Math.round((stats.completed / stats.total) * 100)}%
          </Typography>
        )}
      </Card>

      {/* Task 카드 */}
      {tasks.map((task) => (
        <Card key={task.id} sx={{ "&:hover": { boxShadow: 6 }, transition: "0.3s" }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            {task.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {task.description}
          </Typography>
          <Typography
            variant="caption"
            fontWeight="bold"
            color={
              task.status === "완료"
                ? "success.main"
                : task.status === "진행 중"
                ? "info.main"
                : "text.disabled"
            }
          >
            {task.status}
          </Typography>
        </Card>
      ))}
    </Box>
  );
}
