import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTaskDetail, deleteTask } from "../api/tasks";
import { fetchProjectMembers } from "../api/projects";
import { TaskEdit } from "../components/tasks";
import { Button, Box, Typography, Paper, Stack, CircularProgress } from "@mui/material";
import MarkdownRenderer from "../components/common/MarkdownRenderer";

export default function TaskDetailPage() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const {
    data: task,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchTaskDetail(taskId),
  });

  // 프로젝트 멤버 조회
  const { data: members = [] } = useQuery({
    queryKey: ["projectMembers", projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: !!projectId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      alert("작업이 삭제되었습니다.");
      navigate(`/projects/${projectId}/tasks`);
    },
    onError: () => {
      alert("삭제 중 오류가 발생했습니다.");
    }
  });

  const handleDelete = () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    deleteMutation.mutate();
  };

  if (isLoading) return <CircularProgress sx={{ mt: 2 }} />;
  if (isError) return <Typography color="error">작업 정보를 불러오는데 실패했습니다.</Typography>;
  if (!task) return <Typography>작업 정보를 찾을 수 없습니다.</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        작업 상세
      </Typography>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h5" gutterBottom>{task.title}</Typography>
        <Stack spacing={1} mt={2}>
          <Typography><strong>상태:</strong> {task.status}</Typography>
          {task.assignedUserName && (
            <Typography><strong>담당자:</strong> {task.assignedUserName}</Typography>
          )}
          {task.description && (
            <Box>
              <Typography component="span" fontWeight="bold">설명:</Typography>
              <Box sx={{ mt: 1 }}>
                <MarkdownRenderer content={task.description} />
              </Box>
            </Box>
          )}
          {task.dueDate && (
            <Typography><strong>마감일:</strong> {new Date(task.dueDate).toLocaleDateString()}</Typography>
          )}
        </Stack>
      </Paper>

      {/* 수정/삭제 버튼 */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          color="warning"
          onClick={() => setEditOpen(true)}
        >
          수정
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? "삭제 중..." : "삭제"}
        </Button>
      </Stack>

      <Button
        variant="outlined"
        onClick={() => navigate(-1)}
        sx={{ mt: 2 }}
      >
        ← 목록으로 돌아가기
      </Button>

      {/* 수정 모달 */}
      <TaskEdit
        open={editOpen}
        onClose={() => setEditOpen(false)}
        task={task}
        members={members}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["task", taskId] });
          queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
        }}
      />
    </Box>
  );
}
