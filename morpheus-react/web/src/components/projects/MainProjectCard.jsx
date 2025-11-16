import React, { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MuiCard from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import { useTheme } from "@mui/material/styles";
import { fetchTasksByProject } from "../../api/tasks";
import { fetchProjectById } from "../../api/projects";
import { normalizeStatus, getStatusDisplay } from "../../utils/taskStatus";

/**
 * 메인 페이지용 프로젝트 카드 컴포넌트
 * 선택된 프로젝트의 로그인된 사용자에게 할당된 태스크를 표시합니다.
 *
 * @param {number} projectId - 프로젝트 ID
 * @param {number} userId - 로그인된 사용자 ID
 */
export default function MainProjectCard({ projectId, userId }) {
  const [tasks, setTasks] = useState([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 프로젝트 정보 가져오기
  const fetchProject = useCallback(async () => {
    try {
      const project = await fetchProjectById(projectId);
      if (project) {
        setProjectTitle(project.title);
      }
    } catch (err) {
      console.error("프로젝트 조회 오류:", err);
    }
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const taskList = await fetchTasksByProject(projectId);
      if (taskList) {
        // 로그인된 사용자에게 할당된 태스크만 필터링 (완료된 태스크 제외)
        const assignedTasks = taskList.filter(
          (task) => {
            const normalizedStatus = normalizeStatus(task.status);
            return (
              String(task.assignedUserId) === String(userId) &&
              normalizedStatus !== "done"
            );
          }
        );

        // 마감일 기준 정렬 (마감일이 가까운 순, NULL은 뒤로)
        const sortedTasks = assignedTasks.sort((a, b) => {
          // 둘 다 마감일이 없는 경우: 생성일 기준 내림차순
          if (!a.dueDate && !b.dueDate) {
            return 0; // 원래 순서 유지
          }
          // a만 마감일이 없는 경우: 뒤로
          if (!a.dueDate) return 1;
          // b만 마감일이 없는 경우: 뒤로
          if (!b.dueDate) return -1;
          // 둘 다 마감일이 있는 경우: 가까운 순
          const dateA = new Date(a.dueDate);
          const dateB = new Date(b.dueDate);
          return dateA - dateB;
        });

        setTasks(sortedTasks);
      }
    } catch (err) {
      setError("태스크를 불러오는 중 오류가 발생했습니다.");
      console.error("태스크 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, userId]);

  useEffect(() => {
    if (projectId && userId) {
      fetchProject();
      fetchTasks();
    } else {
      setTasks([]);
      setProjectTitle("");
    }
  }, [projectId, userId, fetchProject, fetchTasks]);

  const getStatusColor = (status) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case "done":
        return "success";
      case "in_progress":
        return "primary";
      case "todo":
        return "default";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `D+${Math.abs(diffDays)}`; // 지난 날짜
    } else if (diffDays === 0) {
      return "D-Day"; // 오늘
    } else {
      return `D-${diffDays}`; // 남은 일수
    }
  };

  if (!projectId || !userId) {
    return null;
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, bgcolor: "error.light", borderRadius: 1, mb: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const theme = useTheme();

  return (
    <Box sx={{ mt: 3, px: 0 }}>
      <MuiCard
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: theme.shape.borderRadius,
          bgcolor: theme.palette.background.paper,
        }}
      >
        {projectTitle && (
          <CardHeader
            title={
              <Typography
                variant="h6"
                sx={{ color: theme.palette.text.primary }}
              >
                {projectTitle || "프로젝트"}
              </Typography>
            }
          />
        )}
        <CardContent>
          <Divider sx={{ mb: 2 }} />

          {/* 태스크 목록 */}
          {tasks.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
              할당된 태스크가 없습니다.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {tasks.map((task) => (
                <Box
                  key={task.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 1,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ mb: 0.5 }}>
                      {task.title}
                    </Typography>
                    {task.dueDate && (
                      <Typography variant="caption" color="text.secondary">
                        {formatDueDate(task.dueDate)}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={getStatusDisplay(task.status)}
                    color={getStatusColor(task.status)}
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </MuiCard>
    </Box>
  );
}



