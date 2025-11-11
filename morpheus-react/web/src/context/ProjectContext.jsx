import React, { createContext, useContext, useState, useEffect } from "react";
import { getProjects } from "../api/projects";
import { useAuthContext } from "./AuthContext";

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuthContext();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 사용자 정보가 로드되지 않았거나 없으면 API 호출 안함
    if (authLoading) return;

    if (user) {
      const fetchProjects = async () => {
        setLoading(true);
        try {
          const res = await getProjects();
          if (res.success) {
            setProjects(res.data.projects || []);
          } else {
            console.error("프로젝트 불러오기 실패:", res.error?.message);
            setProjects([]);
          }
        } catch (err) {
          console.error("프로젝트 불러오기 실패:", err);
          setProjects([]);
        } finally {
          setLoading(false);
        }
      };

      fetchProjects();
    } else {
      // 로그인 안 된 경우 프로젝트 초기화
      setProjects([]);
      setLoading(false);
    }
  }, [user, authLoading]);

  return (
    <ProjectContext.Provider value={{ projects, setProjects, loading }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);
