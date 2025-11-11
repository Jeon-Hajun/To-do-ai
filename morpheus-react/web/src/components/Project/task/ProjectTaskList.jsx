import React, { useEffect, useState } from "react";
import { Box, Typography, Stack, Button, CircularProgress } from "@mui/material";
import { getTasksByProject, deleteTask } from "../../../api/task";
import { getProjectMembers } from "../../../api/projects";
import ProjectTaskEdit from "./ProjectTaskEdit";
import ProjectTaskAdd from "./ProjectTaskAdd";
import ProjectTaskCard from "./ProjectTaskCard";
import { getUser } from "../../../utils/auth";

export default function ProjectTaskList({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingTask, setEditingTask] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const currentUser = getUser();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await getTasksByProject(projectId);
      if (res?.success) setTasks(res.data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await getProjectMembers(projectId);
      if (res?.success) setMembers(res.data.members || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTasks();
      fetchMembers();
    }
  }, [projectId]);

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await deleteTask(taskId);
      if (res.success) fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setEditModalOpen(true);
  };

  if (loading) return <CircularProgress sx={{ mt: 2 }} />;

  // 현재 유저가 오너인지 확인
  const owner = members.find(m => m.role === "owner");
  const isOwner = owner ? String(owner.id) === String(currentUser.id) : false;

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>작업 목록</Typography>

      <Stack spacing={1}>
        {tasks.length === 0 && <Typography color="text.secondary">작업이 없습니다.</Typography>}

        {tasks.map(task => (
          <ProjectTaskCard
            key={task.id}
            task={task}
            members={members}
            currentUser={currentUser}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteTask}
          />
        ))}
      </Stack>

      {isOwner && (
        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="contained" onClick={() => setAddModalOpen(true)}>
            새 작업 추가
          </Button>
        </Box>
      )}

      <ProjectTaskEdit
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        task={editingTask}
        members={members}
        onUpdated={fetchTasks}
      />

      <ProjectTaskAdd
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        projectId={projectId}
        members={members}
        onCreated={fetchTasks}
      />
    </Box>
  );
}
