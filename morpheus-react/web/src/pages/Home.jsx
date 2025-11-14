import React, { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";
import MainProjectCard from "../components/projects/MainProjectCard";
import { Header, NavBar, ContainerBox, CategoryBar } from "../components/layout";

export default function Home() {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();
  const { query } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  // 프로젝트 목록이 로드되면 첫 번째 프로젝트 선택
  useEffect(() => {
    if (query.data && query.data.length > 0 && !selectedProjectId) {
      setSelectedProjectId(query.data[0].id);
    }
  }, [query.data, selectedProjectId]);

  const handleProjectSelect = (projectId) => {
    setSelectedProjectId(projectId);
  };

  if (loading || !user) return null;

  // 프로젝트를 CategoryBar 형식에 맞게 변환
  const projectItems = (query.data || []).map((project) => ({
    id: project.id,
    label: project.title,
  }));

  return (
    <ContainerBox sx={{ pb: 8 }}>
      <Header title="Home" />

      {/* 프로젝트 카테고리 바 */}
      <CategoryBar
        items={projectItems}
        selectedId={selectedProjectId}
        onSelect={handleProjectSelect}
        loading={query.isLoading}
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
