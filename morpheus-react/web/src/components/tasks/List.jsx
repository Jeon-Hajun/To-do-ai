import React, { useState } from "react";
import { Box, Typography, Stack, CircularProgress, Accordion, AccordionSummary, AccordionDetails, Avatar, Paper, Button, Collapse, Chip } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProjectMembers } from "../../api/projects";
import { fetchTasksByProject, deleteTask, createTask, updateTask, assignTask, updateTaskStatus, fetchTaskDetail } from "../../api/tasks";
import { getProfileImageSrc } from "../../utils/profileImage";
import TaskAdd from "./TaskAdd";
import { useAuthContext } from "../../context/AuthContext";
import { normalizeStatus, getStatusDisplay } from "../../utils/taskStatus";
import MarkdownRenderer from "../common/MarkdownRenderer";

export default function List({ projectId }) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthContext();
  const [editingTasks, setEditingTasks] = useState(null); // 드래그한 아코디언의 모든 태스크
  const [selectedMemberId, setSelectedMemberId] = useState(null); // 선택된 사용자 ID
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // 수정 모드 여부
  const [dragOver, setDragOver] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({}); // 클릭한 태스크의 상세 설명 표시
  const [taskDescriptions, setTaskDescriptions] = useState({}); // 태스크 상세 설명 캐시
  const [editingTaskData, setEditingTaskData] = useState({}); // 수정 중인 태스크 데이터

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
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      // 편집 중인 태스크 목록에서도 제거
      if (editingTasks) {
        setEditingTasks(prev => prev?.filter(t => t.id !== taskId) || null);
        if (editingTasks.length === 1) {
          // 마지막 태스크 삭제 시 관리 영역 초기화
          handleCancelEdit();
        }
      }
      // 편집 중인 데이터에서도 제거
      setEditingTaskData(prev => {
        const newData = { ...prev };
        delete newData[taskId];
        return newData;
      });
    },
  });

  // Task 수정
  const updateMutation = useMutation({
    mutationFn: ({ taskId, data }) => updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  // Task 할당
  const assignMutation = useMutation({
    mutationFn: ({ taskId, assignedUserId }) => assignTask(taskId, assignedUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  // Task 상태 변경
  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }) => updateTaskStatus({ id: taskId, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    deleteMutation.mutate(taskId);
  };

  // 드래그 핸들러 팩토리 함수들 (tasksByUser와 unassignedTasks가 정의된 후에 호출됨)
  const createAccordionDragHandler = (tasksByUser, memberId) => (e) => {
    const memberTasks = tasksByUser[String(memberId)] || [];
    e.dataTransfer.setData("application/json", JSON.stringify({
      memberId,
      tasks: memberTasks
    }));
    e.dataTransfer.effectAllowed = "move";
  };

  const createUnassignedDragHandler = (unassignedTasks) => (e) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      memberId: null,
      tasks: unassignedTasks
    }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      // 태스크가 없어도 사용자를 관리 영역에 표시 (태스크 추가를 위해)
      setEditingTasks(data.tasks || []);
      setSelectedMemberId(data.memberId);
    } catch (err) {
      console.error("드롭 데이터 파싱 실패:", err);
    }
  };

  const handleTaskClick = async (taskId) => {
    // 이미 확장된 경우 닫기
    if (expandedTasks[taskId]) {
      setExpandedTasks(prev => ({ ...prev, [taskId]: false }));
      return;
    }

    // 확장하기
    setExpandedTasks(prev => ({ ...prev, [taskId]: true }));

    // 상세 설명이 없으면 가져오기
    if (!taskDescriptions[taskId]) {
      try {
        const detail = await fetchTaskDetail(taskId);
        setTaskDescriptions(prev => ({ ...prev, [taskId]: detail.description || "설명 없음" }));
      } catch (err) {
        console.error("태스크 상세 조회 실패:", err);
        setTaskDescriptions(prev => ({ ...prev, [taskId]: "설명을 불러올 수 없습니다." }));
      }
    }
  };

  const handleSaveTask = async (taskData, taskId) => {
    if (!taskId) return;

    try {
      const task = editingTasks?.find(t => t.id === taskId);
      if (!task) return;

      // 제목, 설명, 마감일 업데이트
      if (taskData.title || taskData.description || taskData.dueDate) {
        await updateMutation.mutateAsync({
          taskId: taskId,
          data: {
            title: taskData.title || task.title,
            description: taskData.description || task.description,
            dueDate: taskData.dueDate || task.dueDate,
          },
        });
      }

      // 상태 변경
      if (taskData.status && taskData.status !== normalizeStatus(task.status)) {
        await statusMutation.mutateAsync({
          taskId: taskId,
          status: taskData.status,
        });
      }

      // 담당자 변경
      if (taskData.assignedUserId !== undefined && taskData.assignedUserId !== task.assignedUserId) {
        await assignMutation.mutateAsync({
          taskId: taskId,
          assignedUserId: taskData.assignedUserId || null,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      // 편집 중인 데이터에서 제거
      setEditingTaskData(prev => {
        const newData = { ...prev };
        delete newData[taskId];
        return newData;
      });
    } catch (err) {
      alert(`작업 저장 실패: ${err.message}`);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      await createTask({
        projectId,
        ...taskData,
        assignedUserId: selectedMemberId || taskData.assignedUserId || null,
      });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setAddModalOpen(false);
    } catch (err) {
      alert(`작업 생성 실패: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingTasks(null);
    setSelectedMemberId(null);
    setIsEditMode(false);
    setEditingTaskData({});
  };

  if (membersLoading || tasksLoading) return <CircularProgress sx={{ mt: 2 }} />;

  // 각 사용자에게 할당된 task 분류
  const tasksByUser = {};
  const unassignedTasks = [];

  tasks.forEach((task) => {
    if (task.assignedUserId) {
      const userId = String(task.assignedUserId);
      if (!tasksByUser[userId]) {
        tasksByUser[userId] = [];
      }
      tasksByUser[userId].push(task);
    } else {
      unassignedTasks.push(task);
    }
  });

  // 편집 중인 사용자가 선택되었는지 확인 (태스크가 없어도 선택 가능)
  const isEditing = editingTasks !== null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        UserList
      </Typography>

      {/* 각 사용자별 아코디언 */}
      {members.map((member) => {
        const memberTasks = tasksByUser[String(member.id)] || [];

        return (
          <Accordion 
            key={member.id} 
            defaultExpanded 
            sx={{ mb: 1, cursor: !isEditing ? "grab" : "default" }}
            draggable={!isEditing}
            onDragStart={createAccordionDragHandler(tasksByUser, member.id)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar
                  alt={member.nickname || member.email}
                  src={getProfileImageSrc(member.profileImage, true)}
                  sx={{ width: 24, height: 24 }}
                >
                  {member.nickname?.[0] || member.email?.[0]}
                </Avatar>
                <Typography variant="h6">
                  {member.nickname || member.email}
                </Typography>
                {member.role && (
                  <Chip
                    label={member.role === 'owner' ? '소유자' : '멤버'}
                    size="small"
                    color={member.role === 'owner' ? 'primary' : 'default'}
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                )}
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              {memberTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                  할당된 태스크가 없습니다.
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {memberTasks.map((task) => {
                  const normalizedStatus = normalizeStatus(task.status);
                  const isExpanded = expandedTasks[task.id];
                  // 상태별 색상
                  const statusColor = 
                    normalizedStatus === "done" ? "#8dfc71ff" : 
                    normalizedStatus === "cancelled" ? "#e6695eff" : 
                    normalizedStatus === "in_progress" ? "#4dabf7ff" : 
                    "#adb5bdff"; // todo
                  return (
                    <Box
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      sx={{
                        display: "flex",
                        py: 0.5,
                        px: 1,
                        borderRadius: 0.5,
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: "action.hover"
                        }
                      }}
                    >
                      {/* 상태 색상 바 */}
                      <Box
                        sx={{
                          width: 4,
                          bgcolor: statusColor,
                          borderRadius: "2px 0 0 2px",
                          mr: 1,
                          flexShrink: 0
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {task.title}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            마감일: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "없음"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            상태: {getStatusDisplay(normalizedStatus)}
                          </Typography>
                        </Stack>
                        <Collapse in={isExpanded}>
                          <Box sx={{ mt: 1, pl: 1, borderLeft: "2px solid", borderColor: "divider" }}>
                            {taskDescriptions[task.id] ? (
                              <MarkdownRenderer 
                                content={taskDescriptions[task.id]} 
                                sx={{ 
                                  "& p": { 
                                    color: "text.secondary",
                                    fontSize: "0.875rem",
                                    margin: 0,
                                  } 
                                }} 
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {isExpanded ? "로딩 중..." : ""}
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </Box>
                    </Box>
                  );
                })}
                </Stack>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* 할당되지 않은 task */}
      {unassignedTasks.length > 0 && (
        <Accordion 
          defaultExpanded 
          sx={{ mt: 2, cursor: !isEditing ? "grab" : "default" }}
          draggable={!isEditing}
          onDragStart={createUnassignedDragHandler(unassignedTasks)}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">할당되지 않은 작업</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={0.5}>
              {unassignedTasks.map((task) => {
                const normalizedStatus = normalizeStatus(task.status);
                const isExpanded = expandedTasks[task.id];
                // 상태별 색상
                const statusColor = 
                  normalizedStatus === "done" ? "#8dfc71ff" : 
                  normalizedStatus === "cancelled" ? "#e6695eff" : 
                  normalizedStatus === "in_progress" ? "#4dabf7ff" : 
                  "#adb5bdff"; // todo
                return (
                  <Box
                    key={task.id}
                    onClick={() => handleTaskClick(task.id)}
                    sx={{
                      display: "flex",
                      py: 0.5,
                      px: 1,
                      borderRadius: 0.5,
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: "action.hover"
                      }
                    }}
                  >
                    {/* 상태 색상 바 */}
                    <Box
                      sx={{
                        width: 4,
                        bgcolor: statusColor,
                        borderRadius: "2px 0 0 2px",
                        mr: 1,
                        flexShrink: 0
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {task.title}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          마감일: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "없음"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          상태: {getStatusDisplay(normalizedStatus)}
                        </Typography>
                      </Stack>
                      <Collapse in={isExpanded}>
                        <Box sx={{ mt: 1, pl: 1, borderLeft: "2px solid", borderColor: "divider" }}>
                          {taskDescriptions[task.id] ? (
                            <MarkdownRenderer 
                              content={taskDescriptions[task.id]} 
                              sx={{ 
                                "& p": { 
                                  color: "text.secondary",
                                  fontSize: "0.875rem",
                                  margin: 0,
                                } 
                              }} 
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {isExpanded ? "로딩 중..." : ""}
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* 태스크 관리 영역 */}
      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">
            태스크 관리
          </Typography>
          {isEditing && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setAddModalOpen(true)}
              >
                생성
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  if (isEditMode) {
                    // 수정 모드 종료 시 편집 중인 데이터 초기화
                    setEditingTaskData({});
                  }
                }}
              >
                {isEditMode ? "수정 완료" : "수정"}
              </Button>
            </Stack>
          )}
        </Box>
        <Paper
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            p: 3,
            minHeight: 200,
            border: dragOver ? "2px dashed #1976d2" : "2px dashed #ccc",
            bgcolor: dragOver ? "action.hover" : "background.paper",
            transition: "all 0.3s",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {isEditing ? (
            <>
              {/* 선택된 사용자 정보 표시 */}
              {selectedMemberId !== null && (
                <Box sx={{ mb: 2, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar
                      alt={members.find(m => String(m.id) === String(selectedMemberId))?.nickname || "사용자"}
                      src={getProfileImageSrc(members.find(m => String(m.id) === String(selectedMemberId))?.profileImage, true)}
                      sx={{ width: 32, height: 32 }}
                    >
                      {members.find(m => String(m.id) === String(selectedMemberId))?.nickname?.[0] || "?"}
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight={500}>
                      {members.find(m => String(m.id) === String(selectedMemberId))?.nickname || "사용자"}의 태스크 관리
                    </Typography>
                    {members.find(m => String(m.id) === String(selectedMemberId))?.role && (
                      <Chip
                        label={members.find(m => String(m.id) === String(selectedMemberId))?.role === 'owner' ? '소유자' : '멤버'}
                        size="small"
                        color={members.find(m => String(m.id) === String(selectedMemberId))?.role === 'owner' ? 'primary' : 'default'}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    )}
                  </Stack>
                </Box>
              )}
              {selectedMemberId === null && (
                <Box sx={{ mb: 2, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight={500}>
                    할당되지 않은 태스크 관리
                  </Typography>
                </Box>
              )}
              <Stack spacing={1}>
                {editingTasks.length > 0 ? (
                  editingTasks.map((task) => {
                  const normalizedStatus = normalizeStatus(task.status);
                  const statusColor = 
                    normalizedStatus === "done" ? "#8dfc71ff" : 
                    normalizedStatus === "cancelled" ? "#e6695eff" : 
                    normalizedStatus === "in_progress" ? "#4dabf7ff" : 
                    "#adb5bdff"; // todo
                  const taskEditData = editingTaskData[task.id] || task;
                  const isTaskEditing = isEditMode && editingTaskData[task.id];
                  
                  return (
                    <Box
                      key={task.id}
                      sx={{
                        display: "flex",
                        p: 2,
                        border: "1px solid #ddd",
                        borderRadius: 1,
                        bgcolor: "background.paper"
                      }}
                    >
                      {/* 상태 색상 바 */}
                      <Box
                        sx={{
                          width: 4,
                          bgcolor: statusColor,
                          borderRadius: "2px 0 0 2px",
                          mr: 1,
                          flexShrink: 0
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        {isTaskEditing ? (
                          <TaskAdd
                            open={false}
                            onClose={() => {
                              setEditingTaskData(prev => {
                                const newData = { ...prev };
                                delete newData[task.id];
                                return newData;
                              });
                            }}
                            projectId={projectId}
                            members={members}
                            editingTask={taskEditData}
                            onSave={(taskData) => handleSaveTask(taskData, task.id)}
                            onDelete={handleDeleteTask}
                          />
                        ) : (
                          <>
                            <Typography variant="subtitle1" fontWeight={500}>
                              {taskEditData.title}
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                마감일: {taskEditData.dueDate ? new Date(taskEditData.dueDate).toLocaleDateString() : "없음"}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                상태: {getStatusDisplay(normalizeStatus(taskEditData.status))}
                              </Typography>
                            </Stack>
                          </>
                        )}
                      </Box>
                      {isEditMode && !isTaskEditing && (
                        <Stack direction="row" spacing={1} sx={{ ml: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setEditingTaskData(prev => ({
                                ...prev,
                                [task.id]: { ...task }
                              }));
                            }}
                          >
                            수정
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            삭제
                          </Button>
                        </Stack>
                      )}
                    </Box>
                  );
                  })
                ) : (
                  <Box sx={{ py: 3, textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      할당된 태스크가 없습니다. "생성" 버튼을 눌러 새 태스크를 추가하세요.
                    </Typography>
                  </Box>
                )}
              </Stack>
              <Button
                variant="outlined"
                onClick={handleCancelEdit}
                sx={{ alignSelf: "flex-start" }}
              >
                취소
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                아코디언을 여기로 드래그하여 태스크를 관리하세요
              </Typography>
            </>
          )}
        </Paper>
      </Box>

      {/* 새 태스크 추가 모달 */}
      <TaskAdd
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        projectId={projectId}
        members={members}
        defaultAssignedUserId={selectedMemberId}
        onCreate={handleCreateTask}
      />

    </Box>
  );
}

