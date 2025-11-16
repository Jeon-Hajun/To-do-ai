import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
} from "@mui/material";
import { useAuthContext } from "../context/AuthContext";
import { useProjects } from "../hooks/useProjects";
import { Header, ContainerBox, PageContainer, CategoryBar } from "../components/layout/index.js";
import { getChatHistory } from "../api/ai";
import ChatBot from "../components/ai/ChatBot";

const PROJECT_ORDER_KEY = "project_order";

export default function AIadvisorPage() {
  const { user } = useAuthContext();
  const { query } = useProjects();
  
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [projectOrder, setProjectOrder] = useState(() => {
    // localStorage에서 저장된 순서 불러오기
    try {
      const saved = localStorage.getItem(PROJECT_ORDER_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  // 프로젝트 선택 시 대화 히스토리 로드
  useEffect(() => {
    if (selectedProjectId) {
      loadChatHistory();
    } else {
      setConversationId(null);
    }
  }, [selectedProjectId]);

  const loadChatHistory = async () => {
    if (!selectedProjectId) return;

    setLoadingHistory(true);
    try {
      const res = await getChatHistory(selectedProjectId);
      if (res.success && res.data) {
        setConversationId(res.data.conversationId);
        // ChatBot 컴포넌트에 메시지를 전달할 수 있도록 상태 관리
        // 현재는 ChatBot이 자체적으로 메시지를 관리하므로 여기서는 conversationId만 설정
      }
    } catch (err) {
      console.error("대화 히스토리 로드 실패:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleError = (error) => {
    console.error("ChatBot 오류:", error);
  };

  const handleProjectSelect = (projectId) => {
    setSelectedProjectId(projectId);
  };

  const handleProjectReorder = (newOrder) => {
    // 순서 업데이트
    setProjectOrder(newOrder);
    // localStorage에 저장
    localStorage.setItem(PROJECT_ORDER_KEY, JSON.stringify(newOrder));
  };

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
    <ContainerBox>
      <Header title="AI Advisor" />

      <PageContainer
        maxWidth="lg"
        sx={{ flex: 1, pt: 4 }}
      >
        <Box sx={{ mt: 4 }}>
          {/* 프로젝트 카테고리 바 */}
          <CategoryBar
            items={projectItems}
            selectedId={selectedProjectId}
            onSelect={handleProjectSelect}
            onReorder={handleProjectReorder}
            loading={query.isLoading || loadingHistory}
            emptyMessage="참여한 프로젝트가 없습니다."
            sx={{ mb: 3 }}
          />

          {/* 챗봇 */}
          {selectedProjectId ? (
            <Card sx={{ height: 600 }}>
              <ChatBot projectId={selectedProjectId} onError={handleError} />
            </Card>
          ) : (
            <Card sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body1" color="text.secondary">
                프로젝트를 선택하면 AI 어시스턴트와 대화를 시작할 수 있습니다.
              </Typography>
            </Card>
          )}
        </Box>
      </PageContainer>
    </ContainerBox>
  );
}
