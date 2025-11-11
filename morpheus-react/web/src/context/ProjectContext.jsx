// src/context/ProjectContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { getProjects, getMembers } from "../api/projects";
import { useAuthContext } from "./AuthContext";

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuthContext();

  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchProjects = async () => {
      setLoading(true);
      try {
        const res = await getProjects();
        if (!res.success) {
          setProjects([]);
          setCurrentProject(null);
          setIsOwner(false);
          return;
        }

        const projList = (res.data.projects || []).map(p => ({
          ...p,
          description: p.description ?? "설명이 없습니다.",
          projectCode: p.project_code ?? null,
        }));

        setProjects(projList);
        const cp = projList[0] || null;
        setCurrentProject(cp);

        // 멤버 정보 + 오너 판단
        if (cp) {
          const membersRes = await getMembers(cp.id);
          if (membersRes.success) {
            const ownerMember = membersRes.data.members?.find(m => m.role === "owner");
            const ownerId = ownerMember ? ownerMember.id : cp.ownerId;
            setIsOwner(String(ownerId) === String(user.id));
          }
        }

      } catch (err) {
        console.error("프로젝트 불러오기 실패:", err);
        setProjects([]);
        setCurrentProject(null);
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user, authLoading]); // 최소한의 의존성만

  // ----------------------
  // 프로젝트 context 업데이트
  // ----------------------
  const updateProjectInContext = (updatedProject) => {
    if (!updatedProject?.id) return;

    setProjects(prev =>
      prev.map(p => (p.id === updatedProject.id ? { ...p, ...updatedProject } : p))
    );

    if (currentProject?.id === updatedProject.id) {
      setCurrentProject(prev => ({ ...prev, ...updatedProject }));
    }
  };

  const updateProjectTitle = (projectId, newTitle) => {
    setProjects(prev =>
      prev.map(p => (p.id === projectId ? { ...p, title: newTitle } : p))
    );
    if (currentProject?.id === projectId) {
      setCurrentProject(prev => ({ ...prev, title: newTitle }));
    }
  };

  const updateProjectGithub = (projectId, newGithubUrl) => {
    setProjects(prev =>
      prev.map(p => (p.id === projectId ? { ...p, githubRepo: newGithubUrl } : p))
    );
    if (currentProject?.id === projectId) {
      setCurrentProject(prev => ({ ...prev, githubRepo: newGithubUrl }));
    }
  };

  const updateProjectMembers = (projectId, newMembers) => {
    setProjects(prev =>
      prev.map(p => (p.id === projectId ? { ...p, members: newMembers } : p))
    );
    if (currentProject?.id === projectId) {
      setCurrentProject(prev => ({ ...prev, members: newMembers }));
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        setProjects,
        currentProject,
        setCurrentProject,
        loading,
        isOwner,
        setIsOwner,
        updateProjectInContext,
        updateProjectTitle,
        updateProjectGithub,
        updateProjectMembers,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);
