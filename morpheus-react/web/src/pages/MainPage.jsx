import React, { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
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
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  // 프로젝트 목록 불러오기
  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await getProjects();
      if (res.success && res.data?.projects) {
        const projectList = res.data.projects || [];
        setProjects(projectList);
        // 첫 번째 프로젝트를 기본 선택
        if (projectList.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projectList[0].id);
        }
      }
    } catch (err) {
      console.error("프로젝트 조회 오류:", err);
    } finally {
      setProjectsLoading(false);
    }
  };

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
