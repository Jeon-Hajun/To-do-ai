// src/components/tasks/TaskManagement.jsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProjectMembers } from "../../api/projects";
import {
  fetchTasksByProject,
  deleteTask,
  updateTask,
  assignTask,
  updateTaskStatus,
} from "../../api/tasks";
import { getTaskAssignmentRecommendation } from "../../api/ai";
import { getProfileImageSrc } from "../../utils/profileImage";
import TaskAdd from "./TaskAdd";
import { normalizeStatus, getStatusDisplay } from "../../utils/taskStatus";

export default function TaskManagement({ projectId }) {
  const queryClient = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [assignMenuAnchor, setAssignMenuAnchor] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [aiRecommendationOpen, setAiRecommendationOpen] = useState(false);
  const [aiRecommendationData, setAiRecommendationData] = useState(null);
  const [aiRecommendationLoading, setAiRecommendationLoading] = useState(false);
  const [aiRecommendationTaskId, setAiRecommendationTaskId] = useState(null);

  // 프로젝트 멤버 조회
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["projectMembers", projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: !!projectId,
  });

  // Task 조회
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => fetchTasksByProject(projectId),
    enabled: !!projectId,
  });

  // Task 삭제
  const deleteMutation = useMutation({
    mutationFn: (taskId) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  // Task 상태 변경
  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }) => updateTaskStatus({ id: taskId, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setStatusMenuAnchor(null);
      setSelectedTaskId(null);
    },
  });

  // Task 할당
  const assignMutation = useMutation({
    mutationFn: ({ taskId, assignedUserId }) => assignTask(taskId, assignedUserId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setAssignMenuAnchor(null);
      setSelectedTaskId(null);
      
      // 할당된 사용자 정보 가져오기
      const assignedMember = getMemberById(variables.assignedUserId);
      if (assignedMember) {
        // 성공 메시지는 조용히 처리 (사용자가 직접 할당한 경우)
        // AI 추천을 통한 할당은 handleAiRecommendationAssign에서 처리
      }
    },
    onError: (error) => {
      console.error("Task 할당 실패:", error);
      alert(`Task 할당 실패: ${error.message || "알 수 없는 오류"}`);
    },
  });

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    deleteMutation.mutate(taskId);
  };

  const handleStatusClick = (event, taskId) => {
    setStatusMenuAnchor(event.currentTarget);
    setSelectedTaskId(taskId);
  };

  const handleStatusChange = (status) => {
    if (selectedTaskId) {
      statusMutation.mutate({ taskId: selectedTaskId, status });
    }
  };

  const handleAssignClick = (event, taskId) => {
    setAssignMenuAnchor(event.currentTarget);
    setSelectedTaskId(taskId);
  };

  const handleAssignChange = (assignedUserId) => {
    if (selectedTaskId) {
      assignMutation.mutate({ taskId: selectedTaskId, assignedUserId });
    }
  };

  // AI 추천 요청
  const handleAiRecommendationClick = async (taskId) => {
    setAiRecommendationTaskId(taskId);
    setAiRecommendationOpen(true);
    setAiRecommendationLoading(true);
    setAiRecommendationData(null);

    try {
      const result = await getTaskAssignmentRecommendation(projectId, taskId);
      if (result.success && result.data) {
        setAiRecommendationData(result.data);
      } else {
        setAiRecommendationData({
          error: result.error?.message || "AI 추천을 받을 수 없습니다.",
        });
      }
    } catch (err) {
      console.error("AI 추천 요청 실패:", err);
      setAiRecommendationData({
        error: err.message || "AI 추천 요청 중 오류가 발생했습니다.",
      });
    } finally {
      setAiRecommendationLoading(false);
    }
  };

  // AI 추천 결과에서 할당하기
  const handleAiRecommendationAssign = () => {
    if (aiRecommendationTaskId && aiRecommendationData?.recommendedUserId) {
      assignMutation.mutate(
        {
          taskId: aiRecommendationTaskId,
          assignedUserId: aiRecommendationData.recommendedUserId,
        },
        {
          onSuccess: () => {
            setAiRecommendationOpen(false);
            setAiRecommendationData(null);
            setAiRecommendationTaskId(null);
            // 성공 메시지는 assignMutation의 onSuccess에서 처리됨
          },
          onError: (error) => {
            console.error("Task 할당 실패:", error);
            alert(`Task 할당 실패: ${error.message || "알 수 없는 오류"}`);
          },
        }
      );
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const { createTask } = await import("../../api/tasks");
      await createTask({
        projectId,
        ...taskData,
      });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setAddModalOpen(false);
    } catch (err) {
      alert(`작업 생성 실패: ${err.message}`);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
  };

  const handleSaveTask = async (taskData) => {
    if (!editingTask) return;
    try {
      await updateTask(editingTask.id, taskData);
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setEditingTask(null);
    } catch (err) {
      alert(`작업 수정 실패: ${err.message}`);
    }
  };

  const getMemberById = (userId) => {
    return members.find((m) => m.id === userId);
  };

  if (membersLoading || tasksLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setAddModalOpen(true)}
        >
          새 태스크 추가
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>제목</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>담당자</TableCell>
              <TableCell>마감일</TableCell>
              <TableCell align="right">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    등록된 태스크가 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const assignedMember = task.assignedUserId
                  ? getMemberById(task.assignedUserId)
                  : null;
                const status = normalizeStatus(task.status);

                return (
                  <TableRow key={task.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {task.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusDisplay(status)}
                        color={
                          status === "done"
                            ? "success"
                            : status === "in_progress"
                            ? "warning"
                            : status === "cancelled"
                            ? "error"
                            : "default"
                        }
                        size="small"
                        onClick={(e) => handleStatusClick(e, task.id)}
                        sx={{ cursor: "pointer" }}
                      />
                    </TableCell>
                    <TableCell>
                      {assignedMember ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            component="img"
                            src={getProfileImageSrc(assignedMember.profileImage, true)}
                            alt={assignedMember.nickname || assignedMember.email}
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                          <Box sx={{ display: "none", width: 24, height: 24, borderRadius: "50%", bgcolor: "primary.main", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.75rem" }}>
                            {(assignedMember.nickname || assignedMember.email || "?")[0]}
                          </Box>
                          <Typography variant="body2">
                            {assignedMember.nickname || assignedMember.email}
                          </Typography>
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => handleAssignClick(e, task.id)}
                          >
                            할당하기
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            startIcon={<AutoAwesomeIcon />}
                            onClick={() => handleAiRecommendationClick(task.id)}
                          >
                            AI 추천
                          </Button>
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        <Typography variant="body2">
                          {new Date(task.dueDate).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          미설정
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditTask(task)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 상태 변경 메뉴 */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={() => {
          setStatusMenuAnchor(null);
          setSelectedTaskId(null);
        }}
      >
        <MenuItem onClick={() => handleStatusChange("todo")}>Todo</MenuItem>
        <MenuItem onClick={() => handleStatusChange("in_progress")}>In Progress</MenuItem>
        <MenuItem onClick={() => handleStatusChange("done")}>Done</MenuItem>
        <MenuItem onClick={() => handleStatusChange("cancelled")}>Cancelled</MenuItem>
      </Menu>

      {/* 담당자 할당 메뉴 */}
      <Menu
        anchorEl={assignMenuAnchor}
        open={Boolean(assignMenuAnchor)}
        onClose={() => {
          setAssignMenuAnchor(null);
          setSelectedTaskId(null);
        }}
      >
        <MenuItem onClick={() => handleAssignChange(null)}>할당 없음</MenuItem>
        {members.map((member) => (
          <MenuItem
            key={member.id}
            onClick={() => handleAssignChange(member.id)}
          >
            {member.nickname || member.email}
          </MenuItem>
        ))}
      </Menu>

      {/* 태스크 추가 모달 */}
      <TaskAdd
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        projectId={projectId}
        members={members}
        onCreate={handleCreateTask}
      />

      {/* 태스크 수정 모달 */}
      {editingTask && (
        <TaskAdd
          open={true}
          onClose={() => setEditingTask(null)}
          projectId={projectId}
          members={members}
          editingTask={editingTask}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* AI 추천 결과 모달 */}
      <Dialog
        open={aiRecommendationOpen}
        onClose={() => {
          setAiRecommendationOpen(false);
          setAiRecommendationData(null);
          setAiRecommendationTaskId(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>AI 할당 추천</DialogTitle>
        <DialogContent>
          {aiRecommendationLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                AI가 적합한 담당자를 분석 중입니다...
              </Typography>
            </Box>
          ) : aiRecommendationData?.error ? (
            <Typography color="error">{aiRecommendationData.error}</Typography>
          ) : aiRecommendationData ? (
            <Box>
              {aiRecommendationData.taskTitle && (
                <Typography variant="h6" gutterBottom>
                  Task: {aiRecommendationData.taskTitle}
                </Typography>
              )}
              {aiRecommendationData.recommendedUserId && (
                <>
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    추천 담당자
                  </Typography>
                  {(() => {
                    const recommendedMember = getMemberById(
                      aiRecommendationData.recommendedUserId
                    );
                    return recommendedMember ? (
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                        <Box
                          component="img"
                          src={getProfileImageSrc(recommendedMember.profileImage, true)}
                          alt={recommendedMember.nickname || recommendedMember.email}
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {recommendedMember.nickname || recommendedMember.email}
                          </Typography>
                          {aiRecommendationData.reason && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {aiRecommendationData.reason}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        사용자 ID: {aiRecommendationData.recommendedUserId}
                      </Typography>
                    );
                  })()}
                  {aiRecommendationData.confidence && (
                    <Chip
                      label={`신뢰도: ${aiRecommendationData.confidence}`}
                      size="small"
                      color={
                        aiRecommendationData.confidence === "high"
                          ? "success"
                          : aiRecommendationData.confidence === "medium"
                          ? "warning"
                          : "default"
                      }
                      sx={{ mt: 2 }}
                    />
                  )}
                  {aiRecommendationData.requiredSkills &&
                    aiRecommendationData.requiredSkills.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          필요한 기술:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {aiRecommendationData.requiredSkills.map((skill, idx) => (
                            <Chip key={idx} label={skill} size="small" />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  {aiRecommendationData.alternativeUsers &&
                    aiRecommendationData.alternativeUsers.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          대안 담당자:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {aiRecommendationData.alternativeUsers.map((userId, idx) => {
                            const altMember = getMemberById(userId);
                            return (
                              <Chip
                                key={idx}
                                label={altMember?.nickname || altMember?.email || `User ${userId}`}
                                size="small"
                                variant="outlined"
                              />
                            );
                          })}
                        </Stack>
                      </Box>
                    )}
                </>
              )}
              {aiRecommendationData.message && (
                <Typography variant="body2" sx={{ mt: 2, whiteSpace: "pre-wrap" }}>
                  {aiRecommendationData.message}
                </Typography>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAiRecommendationOpen(false);
              setAiRecommendationData(null);
              setAiRecommendationTaskId(null);
            }}
          >
            닫기
          </Button>
          {aiRecommendationData?.recommendedUserId && !aiRecommendationData.error && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleAiRecommendationAssign}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? "할당 중..." : "할당하기"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

