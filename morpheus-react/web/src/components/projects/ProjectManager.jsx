import React, { useState } from "react";
import CreateProject from "./CreateProject";
import UpdateProject from "./UpdateProject";
import ProjectCard from "./ProjectCard";
import { Button, IconButton, Dialog, DialogTitle, DialogContent, Box, CircularProgress, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useProjects } from "../../hooks/useProjects";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export default function ProjectManager() {
  const { query, deleteMutation } = useProjects();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [updateTarget, setUpdateTarget] = useState(null);

  const handleModalOpen = (type, target = null) => {
    setModalType(type);
    setUpdateTarget(target);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setUpdateTarget(null);
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const handleLeave = async (projectId) => {
    if (!window.confirm("정말 프로젝트에서 나가시겠습니까?")) return;
    try {
      // TODO: leaveProject API 호출
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch {
      alert("프로젝트 나가기 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm("정말 프로젝트를 삭제하시겠습니까?")) return;
    deleteMutation.mutate(projectId);
  };

  const handleUpdate = (project) => {
    handleModalOpen("update", project);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  return (
    <Box sx={{ padding: 2 }}>
      {/* 버튼 영역 */}
      <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 1.5, marginBottom: 1 }}>
        <Button variant="contained" onClick={() => handleModalOpen("create")}>
          프로젝트 생성
        </Button>
        <Button variant="outlined" onClick={() => navigate("/projects/all")}>
          프로젝트 참여
        </Button>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-end", marginBottom: 2 }}>
        <IconButton onClick={handleRefresh} color="primary" title="새로고침">
          <RefreshIcon />
        </IconButton>
      </Box>

      {query.isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!query.isLoading && (!query.data || query.data.length === 0) && (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
          참여한 프로젝트가 없습니다.
        </Typography>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: 2,
        }}
      >
        {query.data?.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onLeave={handleLeave}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            onClick={(id) => navigate(`/projects/${id}`)}
          />
        ))}
      </Box>

      {/* 모달 */}
      <Dialog open={modalOpen} onClose={handleModalClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {modalType === "create" && "프로젝트 생성"}
          {modalType === "update" && "프로젝트 수정"}
        </DialogTitle>
        <DialogContent dividers>
          {modalType === "create" && (
            <CreateProject
              onCancel={handleModalClose}
              onSuccess={handleModalClose}
            />
          )}
          {modalType === "update" && (
            <UpdateProject
              project={updateTarget}
              onUpdateSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["projects"] });
                handleModalClose();
              }}
              onClose={handleModalClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
