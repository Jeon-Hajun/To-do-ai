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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProjectMembers } from "../../api/projects";
import {
  fetchTasksByProject,
  deleteTask,
  updateTask,
  assignTask,
  updateTaskStatus,
} from "../../api/tasks";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setAssignMenuAnchor(null);
      setSelectedTaskId(null);
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
    </Box>
  );
}

