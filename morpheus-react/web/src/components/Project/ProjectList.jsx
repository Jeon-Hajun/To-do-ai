// src/components/Project/ProjectList.jsx
import React, { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";
import { getProjects, leaveProject, deleteProject, updateProject } from "../../api/projects";
import { getUser } from "../../utils/auth";

export default function ProjectList() {
  const currentUser = getUser();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 프로젝트 목록 불러오기
  const fetchProjects = async () => {
    setLoading(true);
    const res = await getProjects();
    if (res.success) {
      setProjects(res.data.projects || []); // 벡엔드 구조에 맞춰 projects 배열 사용
    } else {
      setError(res.error?.message || "프로젝트를 불러오는 중 오류 발생");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleLeave = async (projectId) => {
    if (!window.confirm("정말 프로젝트에서 나가시겠습니까?")) return;
    const res = await leaveProject(projectId);
    if (res.success) {
      setProjects(projects.filter((p) => p.id !== projectId));
    } else {
      alert(res.error?.message || "프로젝트 나가기 실패");
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm("정말 프로젝트를 삭제하시겠습니까?")) return;
    const res = await deleteProject(projectId);
    if (res.success) {
      setProjects(projects.filter((p) => p.id !== projectId));
    } else {
      alert(res.error?.message || "프로젝트 삭제 실패");
    }
  };

  const handleUpdate = async (project) => {
    const newTitle = prompt("새 프로젝트 제목을 입력하세요", project.title);
    if (!newTitle) return;

    const res = await updateProject(project.id, { title: newTitle });
    if (res.success) {
      setProjects(
        projects.map((p) => (p.id === project.id ? { ...p, title: newTitle } : p))
      );
    } else {
      alert(res.error?.message || "프로젝트 수정 실패");
    }
  };

  if (loading) return <p>프로젝트 불러오는 중...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      {projects.length === 0 && <p>참여한 프로젝트가 없습니다.</p>}
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          currentUser={currentUser}
          onLeave={handleLeave}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
}
