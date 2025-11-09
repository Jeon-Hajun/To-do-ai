import React, { useEffect, useState } from "react";
import CustomModal from "../ui/Modal";
import CreateProject from "./CreateProject";
import JoinProject from "./JoinProject";
import { getProjects, leaveProject } from "../../api/projects";
import ProjectCard from "./ProjectCard";
import Button from "../ui/Button";

export default function ProjectManager() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(""); // 'create' | 'join'

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await getProjects();
      if (res.success) setProjects(res.data.projects);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateSuccess = (project) => {
    setProjects((prev) => [project, ...prev]);
    setModalOpen(false);
  };

  const handleJoinSuccess = (project) => {
    setProjects((prev) => [project, ...prev]);
    setModalOpen(false);
  };

  const handleLeave = async (projectId) => {
    try {
      const res = await leaveProject(projectId);
      if (res.success) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4">
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <Button
          type="primary"
          onClick={() => {
            setModalType("create");
            setModalOpen(true);
          }}
        >
          프로젝트 생성
        </Button>
        <Button
          type="primary"
          onClick={() => {
            setModalType("join");
            setModalOpen(true);
          }}
        >
          프로젝트 참여
        </Button>
      </div>

      {loading ? (
        <div>로딩 중...</div>
      ) : (
        projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onLeave={() => handleLeave(project.id)}
          />
        ))
      )}

      <CustomModal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        {modalType === "create" && (
          <CreateProject onCreateSuccess={handleCreateSuccess} />
        )}
        {modalType === "join" && (
          <JoinProject onJoin={handleJoinSuccess} />
        )}
      </CustomModal>
    </div>
  );
}
