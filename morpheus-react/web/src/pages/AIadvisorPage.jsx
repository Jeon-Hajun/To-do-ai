import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Card,
} from "@mui/material";
import { useAuthContext } from "../context/AuthContext";
import { useProjects } from "../hooks/useProjects";
import { Header, ContainerBox, PageContainer } from "../components/layout/index.js";
import { getChatHistory } from "../api/ai";
import ChatBot from "../components/ai/ChatBot";

export default function AIadvisorPage() {
  const { user } = useAuthContext();
  const { query } = useProjects();
  
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  return (
    <ContainerBox>
      <Header title="AI Advisor" />

      <PageContainer
        title="AI 어시스턴트"
        maxWidth="lg"
        sx={{ flex: 1, pt: 4 }}
      >
        <Box sx={{ mt: 4 }}>
          {/* 프로젝트 선택 */}
          <Card sx={{ p: 3, mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>프로젝트 선택</InputLabel>
              <Select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                }}
                label="프로젝트 선택"
                disabled={query.isLoading || loadingHistory}
              >
                {!query.data || query.data.length === 0 ? (
                  <MenuItem disabled>프로젝트가 없습니다</MenuItem>
                ) : (
                  query.data.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.title}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            {(!query.data || query.data.length === 0) && (
              <Alert severity="info" sx={{ mt: 2 }}>
                프로젝트를 먼저 생성해주세요.
              </Alert>
            )}
          </Card>

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
