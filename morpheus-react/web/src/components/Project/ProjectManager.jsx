// src/components/Project/ProjectManager.jsx
import React, { useState, useEffect } from "react";
import CreateProject from "./CreateProject";
import JoinProject from "./JoinProject";
import UpdateProject from "./UpdateProject";
import ProjectCard from "./ProjectCard";
import Button from "../ui/Button";
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import { useProject } from "../../context/ProjectContext";

export default function ProjectManager() {
  const { projects, setProjects, loading, updateProjectInContext } = useProject();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [updateTarget, setUpdateTarget] = useState(null);

  const fetchProjects = async () => {
    // Context에서 이미 fetchProjects를 할 수도 있고, 필요하면 다시 API 호출
    // 여기서는 단순히 Context setProjects를 통해 업데이트
  };

  const handleModalOpen = (type, target = null) => {
    setModalType(type);
    setUpdateTarget(target);
    setModalOpen(true);
  };
  const handleModalClose = () => setModalOpen(false);

  const handleLeave = async (projectId) => {
    if (!window.confirm("정말 프로젝트에서 나가시겠습니까?")) return;
    try {
      // API 호출 후 Context 갱신
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch {
      alert("프로젝트 나가기 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm("정말 프로젝트를 삭제하시겠습니까?")) return;
    try {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch {
      alert("프로젝트 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleUpdate = (project) => handleModalOpen("update", project);

  return (
    <div style={{ padding: 16 }}>
      {/* 버튼 영역 */}
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <Button onClick={() => handleModalOpen("create")}>프로젝트 생성</Button>
        <Button onClick={() => handleModalOpen("join")}>프로젝트 참여</Button>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <IconButton onClick={fetchProjects} color="primary" title="새로고침">
          <RefreshIcon />
        </IconButton>
      </div>

      {loading && <div>로딩 중...</div>}
      {!loading && projects.length === 0 && <div>참여한 프로젝트가 없습니다.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onLeave={handleLeave}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        ))}
      </div>

      {/* 모달 */}
      <Dialog open={modalOpen} onClose={handleModalClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {modalType === "create" && "프로젝트 생성"}
          {modalType === "join" && "프로젝트 참여"}
          {modalType === "update" && "프로젝트 수정"}
        </DialogTitle>
        <DialogContent dividers>
          {modalType === "create" && (
            <CreateProject
              onCancel={() => handleModalClose()}
            />
          )}
          {modalType === "join" && (
            <JoinProject
              onJoinSuccess={() => handleModalClose()}
              onClose={handleModalClose}
            />
          )}
          {modalType === "update" && (
            <UpdateProject
              project={updateTarget}
              onUpdateSuccess={(updated) => {
                updateProjectInContext(updated);
                handleModalClose();
              }}
              onClose={handleModalClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
