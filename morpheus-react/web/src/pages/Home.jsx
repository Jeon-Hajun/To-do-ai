import React, { useEffect, useState, useMemo } from "react";
import { Box } from "@mui/material";
import { useAuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";
import MainProjectCard from "../components/projects/MainProjectCard";
import { Header, ContainerBox, CategoryBar } from "../components/layout/index.js";

const PROJECT_ORDER_KEY = "project_order";

export default function Home() {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();
  const { query } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectOrder, setProjectOrder] = useState(() => {
    // localStorage에서 저장된 순서 불러오기
    try {
      const saved = localStorage.getItem(PROJECT_ORDER_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  // 프로젝트 목록이 로드되면 순서 적용 및 첫 번째 프로젝트 선택
  const orderedProjects = useMemo(() => {
    if (!query.data || query.data.length === 0) return [];
    
    const projects = [...query.data];
    const ordered = [];
    const unordered = [];
    
    // 저장된 순서대로 정렬
    projectOrder.forEach((id) => {
      const project = projects.find((p) => p.id === id);
      if (project) ordered.push(project);
    });
    
    // 순서에 없는 프로젝트는 뒤에 추가
    projects.forEach((project) => {
      if (!projectOrder.includes(project.id)) {
        unordered.push(project);
      }
    });
    
    return [...ordered, ...unordered];
  }, [query.data, projectOrder]);

  useEffect(() => {
    if (orderedProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(orderedProjects[0].id);
    }
  }, [orderedProjects, selectedProjectId]);

  const handleProjectSelect = (projectId) => {
    setSelectedProjectId(projectId);
  };

  const handleProjectReorder = (newOrder) => {
    // 순서 업데이트
    setProjectOrder(newOrder);
    // localStorage에 저장
    localStorage.setItem(PROJECT_ORDER_KEY, JSON.stringify(newOrder));
  };

  if (loading) {
    return (
      <ContainerBox sx={{ pb: 8 }}>
        <Header title="Home" />
        <Box sx={{ p: 3, textAlign: 'center' }}>로딩 중...</Box>
      </ContainerBox>
    );
  }
  
  if (!user) {
    return null; // navigate로 리다이렉트되므로 null 반환
  }

  // 프로젝트를 CategoryBar 형식에 맞게 변환 (제목 길이 제한)
  const projectItems = orderedProjects.map((project) => {
    const maxLength = 10; // 최대 글자수
    const truncatedTitle = project.title.length > maxLength 
      ? project.title.substring(0, maxLength) + "..." 
      : project.title;
    
    return {
      id: project.id,
      label: truncatedTitle,
      fullLabel: project.title, // 전체 제목은 툴팁 등에 사용 가능
    };
  });

  return (
    <ContainerBox sx={{ pb: 8 }}>
      <Header title="Home" />

      {/* 프로젝트 카테고리 바 */}
      <CategoryBar
        items={projectItems}
        selectedId={selectedProjectId}
        onSelect={handleProjectSelect}
        onReorder={handleProjectReorder}
        loading={query.isLoading}
        emptyMessage="참여한 프로젝트가 없습니다."
      />

      {/* 선택된 프로젝트의 태스크 표시 */}
      {selectedProjectId && user?.id && (
        <MainProjectCard projectId={selectedProjectId} userId={user.id} />
      )}
    </ContainerBox>
  );
}
