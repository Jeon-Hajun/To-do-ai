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
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProjectMembers } from "../../api/projects";
import {
  fetchTasksByProject,
  deleteTask,
  updateTask,
  assignTask,
  updateTaskStatus,
} from "../../api/tasks";
import { getTaskAssignmentRecommendation, getBatchTaskAssignmentRecommendations } from "../../api/ai";
import { getProfileImageSrc } from "../../utils/profileImage";
import TaskAdd from "./TaskAdd";
import { normalizeStatus, getStatusDisplay } from "../../utils/taskStatus";

export default function TaskManagement({ projectId }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [assignMenuAnchor, setAssignMenuAnchor] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [aiRecommendationOpen, setAiRecommendationOpen] = useState(false);
  const [aiRecommendationData, setAiRecommendationData] = useState(null);
  const [aiRecommendationLoading, setAiRecommendationLoading] = useState(false);
  const [aiRecommendationTaskId, setAiRecommendationTaskId] = useState(null);
  
  // 일괄 할당 관련 state
  const [batchAssignmentOpen, setBatchAssignmentOpen] = useState(false);
  const [batchAssignmentData, setBatchAssignmentData] = useState(null);
  const [batchAssignmentLoading, setBatchAssignmentLoading] = useState(false);

  // 프로젝트 멤버 조회
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["projectMembers", projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: !!projectId,
  });

  // Task 조회
  const { 
    data: tasks = [], 
    isLoading: tasksLoading, 
    isError: tasksError, 
    error: tasksErrorData 
  } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => fetchTasksByProject(projectId),
    enabled: !!projectId,
    onError: (error) => {
      console.error('[TaskManagement] Task 조회 실패:', error);
    },
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
    setActionMenuAnchor(null);
    setSelectedTaskId(null);
  };

  const handleActionMenuClick = (event, taskId) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedTaskId(taskId);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedTaskId(null);
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

  // 미할당 Task 목록
  const unassignedTasks = tasks.filter((task) => !task.assignedUserId);

  // 일괄 할당 요청
  const handleBatchAiAssignment = async () => {
    if (unassignedTasks.length === 0) {
      alert("할당할 미할당 Task가 없습니다.");
      return;
    }

    setBatchAssignmentOpen(true);
    setBatchAssignmentLoading(true);
    setBatchAssignmentData(null);

    try {
      const result = await getBatchTaskAssignmentRecommendations(projectId);
      if (result.success && result.data) {
        setBatchAssignmentData(result.data);
      } else {
        setBatchAssignmentData({
          error: result.error?.message || "일괄 할당 추천을 받을 수 없습니다.",
        });
      }
    } catch (err) {
      console.error("일괄 할당 추천 요청 실패:", err);
      setBatchAssignmentData({
        error: err.message || "일괄 할당 추천 요청 중 오류가 발생했습니다.",
      });
    } finally {
      setBatchAssignmentLoading(false);
    }
  };

  // 일괄 할당 실행
  const handleBatchAssign = async () => {
    if (!batchAssignmentData?.recommendations || batchAssignmentData.recommendations.length === 0) {
      alert("할당할 추천이 없습니다.");
      return;
    }

    const confirmMessage = `총 ${batchAssignmentData.recommendations.length}개의 Task를 할당하시겠습니까?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const rec of batchAssignmentData.recommendations) {
      try {
        await assignTask(rec.taskId, rec.recommendedUserId);
        successCount++;
      } catch (err) {
        failCount++;
        errors.push({
          taskTitle: rec.taskTitle,
          error: err.message || "할당 실패",
        });
        console.error(`Task ${rec.taskId} 할당 실패:`, err);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    setBatchAssignmentOpen(false);
    setBatchAssignmentData(null);

    if (failCount === 0) {
      alert(`모든 Task(${successCount}개)가 성공적으로 할당되었습니다.`);
    } else {
      alert(
        `할당 완료: ${successCount}개 성공, ${failCount}개 실패\n\n실패한 Task:\n${errors.map((e) => `- ${e.taskTitle}: ${e.error}`).join("\n")}`
      );
    }
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
      <Box sx={{ 
        display: "flex", 
        flexDirection: { xs: "column", md: "row" },
        gap: { xs: 1, md: 2 },
        justifyContent: "space-between", 
        alignItems: { xs: "stretch", md: "center" }, 
        mb: { xs: 2, md: 3 } 
      }}>
        {unassignedTasks.length > 0 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleBatchAiAssignment}
            disabled={batchAssignmentLoading}
            fullWidth={isMobile}
            size={isMobile ? "small" : "medium"}
          >
            {batchAssignmentLoading ? "AI 분석 중..." : `모든 미할당 Task AI 할당 (${unassignedTasks.length}개)`}
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setAddModalOpen(true)}
          fullWidth={isMobile}
          size={isMobile ? "small" : "medium"}
        >
          새 태스크 추가
        </Button>
      </Box>

      {isMobile ? (
        // 모바일: 카드 형태
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {tasksLoading ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                태스크를 불러오는 중...
              </Typography>
            </Box>
          ) : tasksError ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                태스크를 불러오는데 실패했습니다.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {tasksErrorData?.message || "알 수 없는 오류가 발생했습니다."}
              </Typography>
            </Box>
          ) : tasks.length === 0 ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                등록된 태스크가 없습니다.
              </Typography>
            </Box>
          ) : (
            tasks.map((task) => {
              const assignedMember = task.assignedUserId
                ? getMemberById(task.assignedUserId)
                : null;
              const status = normalizeStatus(task.status);

              return (
                <Card key={task.id} sx={{ p: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                    <Typography variant="body1" fontWeight="medium" sx={{ flex: 1, fontSize: "0.9rem" }}>
                      {task.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleActionMenuClick(e, task.id)}
                      sx={{ ml: 1 }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  <Stack spacing={1}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 50, fontSize: "0.75rem" }}>
                        상태:
                      </Typography>
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
                        sx={{ cursor: "pointer", fontSize: "0.7rem" }}
                      />
                    </Box>
                    
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {assignedMember ? (
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
                      ) : null}
                      <Box sx={{ display: assignedMember ? "none" : "flex", width: 24, height: 24, borderRadius: "50%", bgcolor: "primary.main", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.7rem" }}>
                        {(assignedMember?.nickname || assignedMember?.email || "?")[0]}
                      </Box>
                      {!assignedMember && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => handleAssignClick(e, task.id)}
                          sx={{ fontSize: "0.7rem", py: 0.25, px: 1 }}
                        >
                          할당
                        </Button>
                      )}
                    </Box>
                    
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 50, fontSize: "0.75rem" }}>
                        마감일:
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("ko-KR", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            })
                          : "미설정"}
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              );
            })
          )}
        </Box>
      ) : (
        // 데스크톱: 테이블 형태
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
              {tasksLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      태스크를 불러오는 중...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : tasksError ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                      태스크를 불러오는데 실패했습니다.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tasksErrorData?.message || "알 수 없는 오류가 발생했습니다."}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
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
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => handleAssignClick(e, task.id)}
                          >
                            할당하기
                          </Button>
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
                        <IconButton
                          size="small"
                          onClick={(e) => handleActionMenuClick(e, task.id)}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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

      {/* 작업 메뉴 (수정/삭제) */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        {selectedTaskId && (
          <>
            <MenuItem
              onClick={() => {
                const task = tasks.find((t) => t.id === selectedTaskId);
                if (task) {
                  handleEditTask(task);
                }
              }}
            >
              <EditIcon sx={{ mr: 1, fontSize: "1rem" }} />
              수정
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (selectedTaskId) {
                  handleDeleteTask(selectedTaskId);
                  handleActionMenuClose();
                }
              }}
              sx={{ color: "error.main" }}
            >
              <DeleteIcon sx={{ mr: 1, fontSize: "1rem" }} />
              삭제
            </MenuItem>
          </>
        )}
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

      {/* 일괄 할당 결과 모달 */}
      <Dialog
        open={batchAssignmentOpen}
        onClose={() => {
          setBatchAssignmentOpen(false);
          setBatchAssignmentData(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>일괄 Task 할당 추천 결과</DialogTitle>
        <DialogContent>
          {batchAssignmentLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                AI가 모든 미할당 Task를 분석 중입니다...
              </Typography>
            </Box>
          ) : batchAssignmentData?.error ? (
            <Typography color="error">{batchAssignmentData.error}</Typography>
          ) : batchAssignmentData ? (
            <Box>
              <Typography variant="body1" gutterBottom>
                총 {batchAssignmentData.totalTasks}개 중 {batchAssignmentData.successCount}개 추천 완료
                {batchAssignmentData.errorCount > 0 && `, ${batchAssignmentData.errorCount}개 실패`}
              </Typography>
              
              {batchAssignmentData.recommendations && batchAssignmentData.recommendations.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    추천 결과
                  </Typography>
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Task</TableCell>
                          <TableCell>추천 담당자</TableCell>
                          <TableCell>이유</TableCell>
                          <TableCell>신뢰도</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {batchAssignmentData.recommendations.map((rec) => {
                          const recommendedMember = getMemberById(rec.recommendedUserId);
                          return (
                            <TableRow key={rec.taskId}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {rec.taskTitle}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {recommendedMember ? (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Box
                                      component="img"
                                      src={getProfileImageSrc(recommendedMember.profileImage, true)}
                                      alt={recommendedMember.nickname || recommendedMember.email}
                                      sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                      }}
                                    />
                                    <Typography variant="body2">
                                      {recommendedMember.nickname || recommendedMember.email}
                                    </Typography>
                                  </Stack>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    사용자 ID: {rec.recommendedUserId}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {rec.reason || "이유 없음"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={rec.confidence || "medium"}
                                  size="small"
                                  color={
                                    rec.confidence === "high"
                                      ? "success"
                                      : rec.confidence === "medium"
                                      ? "warning"
                                      : "default"
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
              
              {batchAssignmentData.errors && batchAssignmentData.errors.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom color="error">
                    실패한 Task ({batchAssignmentData.errors.length}개)
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {batchAssignmentData.errors.map((err, idx) => (
                      <Typography key={idx} variant="body2" color="error" sx={{ mb: 0.5 }}>
                        - {err.taskTitle}: {err.error}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setBatchAssignmentOpen(false);
            setBatchAssignmentData(null);
          }}>
            닫기
          </Button>
          {batchAssignmentData?.recommendations && batchAssignmentData.recommendations.length > 0 && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleBatchAssign}
            >
              전체 할당하기 ({batchAssignmentData.recommendations.length}개)
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

