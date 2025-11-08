import React, { useEffect, useState } from "react";
import JoinProject from "./JoinProject";
import ProjectList from "./ProjectList";
import ProjectDetailModal from "./ProjectDetailModal";
import { getUserProjects } from "../../api/projects";

export function ProjectManager() {
  const [projects, setProjects] = useState([]);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const fetchProjects = async () => {
    const list = await getUserProjects();
    setProjects(list);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleJoin = (project) => {
    if (project && !projects.find((p) => p.id === project.id)) {
      setProjects((prev) => [...prev, project]);
    }
    setIsJoinModalOpen(false);
  };

  const handleCardClick = (project) => {
    setSelectedProject(project); // 클릭 시 상세 모달 열림
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition"
        onClick={() => setIsJoinModalOpen(true)}
      >
        프로젝트 참가
      </button>

      <ProjectList projects={projects} onSelect={handleCardClick} />

      {isJoinModalOpen && <JoinProject onJoin={handleJoin} />}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}
