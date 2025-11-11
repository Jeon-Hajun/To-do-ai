import React, { useEffect, useState, useCallback } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import ContainerBox from "../components/ui/ContainerBox";
import PageContainer from "../components/ui/PageContainer";
import CategoryBar from "../components/ui/CategoryBar";
import MainProjectCard from "../components/MainProjectCard";
import { getProjects } from "../api/projects";

export default function MainPage() {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    
    setProjectsLoading(true);
    try {
      const res = await getProjects();
      if (res.success && res.data?.projects) {
        const projectList = res.data.projects || [];
        setProjects(projectList);
        // 첫 번째 프로젝트를 기본 선택 (기존 선택이 없거나 현재 선택된 프로젝트가 목록에 없을 때)
        setSelectedProjectId(prevId => {
          if (projectList.length > 0) {
            const currentProjectExists = projectList.some(p => p.id === prevId);
            if (!prevId || !currentProjectExists) {
              return projectList[0].id;
            }
            return prevId;
          }
          return null;
        });
      }
    } catch (err) {
      console.error("프로젝트 조회 오류:", err);
    } finally {
      setProjectsLoading(false);
    }
  }, [user?.id]);

  // 프로젝트 목록 불러오기
  // user 객체가 로드되고 주요 속성이 변경될 때 프로젝트를 다시 불러오기
  useEffect(() => {
    // user가 로드되지 않았거나 id가 없으면 중단
    if (loading || !user?.id) return;
    
    fetchProjects();
  }, [user, loading, location.pathname, fetchProjects]);

  // 프로필 수정 이벤트 감지
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (user?.id) {
        fetchProjects();
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user?.id, fetchProjects]);

  // 페이지가 focus될 때 프로젝트를 다시 불러오기 (다른 페이지에서 돌아올 때)
  useEffect(() => {
    const handleFocus = () => {
      if (user?.id && location.pathname === '/main') {
        fetchProjects();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, location.pathname, fetchProjects]);

  const handleProjectSelect = (projectId) => {
    setSelectedProjectId(projectId);
  };

  if (loading || !user) return null;

  // 프로젝트를 CategoryBar 형식에 맞게 변환
  const projectItems = projects.map((project) => ({
    id: project.id,
    label: project.title,
  }));

  return (
    <ContainerBox sx={{ bgcolor: "grey.100", pb: 8 }}>
      <Header title="Home" />
        {/* 프로젝트 카테고리 바 */}
        <CategoryBar
          items={projectItems}
          selectedId={selectedProjectId}
          onSelect={handleProjectSelect}
          loading={projectsLoading}
          emptyMessage="참여한 프로젝트가 없습니다."
        />

        {/* 선택된 프로젝트의 태스크 표시 */}
        {selectedProjectId && user?.id && (
          <MainProjectCard projectId={selectedProjectId} userId={user.id} />
        )}
      <NavBar />
    </ContainerBox>
  );
}
