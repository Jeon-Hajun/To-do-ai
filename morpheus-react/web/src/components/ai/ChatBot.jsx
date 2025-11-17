import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Stack,
  Chip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import DeleteIcon from "@mui/icons-material/Delete";
import { sendChatMessage, clearConversation, getChatHistory } from "../../api/ai";

export default function ChatBot({ projectId, onError }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 프로젝트 변경 시 대화 히스토리 로드
  useEffect(() => {
    if (projectId) {
      loadHistory();
    } else {
      setMessages([]);
      setConversationId(null);
    }
  }, [projectId]);

  const loadHistory = async () => {
    if (!projectId) return;

    setLoadingHistory(true);
    try {
      const res = await getChatHistory(projectId);
      if (res.success && res.data) {
        setConversationId(res.data.conversationId);
        if (res.data.messages && res.data.messages.length > 0) {
          const formattedMessages = res.data.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            agentType: msg.agentType,
            // response는 저장되지 않으므로 재구성 필요 없음
          }));
          setMessages(formattedMessages);
        }
      }
    } catch (err) {
      console.error("대화 히스토리 로드 실패:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading || !projectId) {
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setLoading(true);
    setError(null);

    // 사용자 메시지를 즉시 표시
    const newUserMessage = {
      role: "user",
      content: userMessage,
      id: Date.now(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      // 대화 히스토리 준비 (현재 메시지 제외)
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const res = await sendChatMessage(projectId, userMessage, history);

      if (res.success) {
        const assistantMessage = {
          role: "assistant",
          content: res.data.message,
          agentType: res.data.agentType,
          response: res.data.response,
          id: Date.now() + 1,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setConversationId(res.data.conversationId);
      } else {
        setError(res.error?.message || "메시지 전송에 실패했습니다.");
        if (onError) {
          onError(res.error);
        }
        // 사용자 메시지 제거 (실패한 경우)
        setMessages((prev) => prev.filter((msg) => msg.id !== newUserMessage.id));
      }
    } catch (err) {
      console.error("메시지 전송 오류:", err);
      setError(err.message || "메시지 전송 중 오류가 발생했습니다.");
      if (onError) {
        onError({ message: err.message });
      }
      // 사용자 메시지 제거 (실패한 경우)
      setMessages((prev) => prev.filter((msg) => msg.id !== newUserMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const handleClearConversation = async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    if (!window.confirm("대화 히스토리를 초기화하시겠습니까?")) {
      return;
    }

    try {
      const res = await clearConversation(conversationId);
      if (res.success) {
        setMessages([]);
        setConversationId(null);
      } else {
        setError(res.error?.message || "대화 히스토리 초기화에 실패했습니다.");
      }
    } catch (err) {
      console.error("대화 히스토리 초기화 오류:", err);
      setError(err.message || "대화 히스토리 초기화 중 오류가 발생했습니다.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: { xs: 300, md: 500 } }}>
      {/* 헤더 */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: { xs: 1, sm: 1.5, md: 2 },
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>AI 어시스턴트</Typography>
        {conversationId && (
          <IconButton
            onClick={handleClearConversation}
            size="small"
            color="error"
            title="대화 히스토리 초기화"
          >
            <DeleteIcon />
          </IconButton>
        )}
      </Box>

      {/* 메시지 영역 */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: { xs: 1, sm: 1.5, md: 2 },
          bgcolor: "background.default",
        }}
      >
        {loadingHistory && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <CircularProgress />
          </Box>
        )}

            {!loadingHistory && messages.length === 0 && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "text.secondary",
                  p: 3,
                }}
              >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                  안녕하세요! 프로젝트 관리 AI 어시스턴트입니다.
                </Typography>
                <Typography variant="body2" sx={{ mb: 3, textAlign: "center", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                  다음과 같은 기능을 사용할 수 있습니다:
                </Typography>
                <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 500 } }}>
                  <Stack spacing={1}>
                    <Paper sx={{ p: { xs: 1, md: 1.5 }, bgcolor: "background.paper" }}>
                      <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5, fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                        📊 프로젝트 진행도 분석
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                        "진행도 알려줘", "프로젝트 상태 분석해줘"
                      </Typography>
                    </Paper>
                    <Paper sx={{ p: { xs: 1, md: 1.5 }, bgcolor: "background.paper" }}>
                      <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5, fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                        💡 Task 제안
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                        "할 일 추천해줘", "새로운 작업 제안해줘"
                      </Typography>
                    </Paper>
                    <Paper sx={{ p: { xs: 1, md: 1.5 }, bgcolor: "background.paper" }}>
                      <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5, fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                        ✅ Task 완료 확인
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                        "이 작업 완료됐어?", "Task 완료 확인해줘"
                      </Typography>
                    </Paper>
                    <Paper sx={{ p: { xs: 1, md: 1.5 }, bgcolor: "background.paper" }}>
                      <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5, fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                        📝 프로젝트 정보 질문
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                        "커밋 몇 개야?", "프로젝트 설명해줘", "작업 몇 개 있어?"
                      </Typography>
                    </Paper>
                    <Paper sx={{ p: { xs: 1, md: 1.5 }, bgcolor: "background.paper" }}>
                      <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5, fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                        👤 Task 할당 추천
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
                        "이 Task를 누구에게 할당하면 좋을까?", "Task 할당 추천해줘"
                      </Typography>
                    </Paper>
                  </Stack>
                </Box>
                <Typography variant="body2" sx={{ mt: 3, color: "text.secondary", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                  위의 예시처럼 질문을 입력해주세요!
                </Typography>
              </Box>
            )}

        {!loadingHistory &&
          messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: "flex",
                justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                mb: 2,
              }}
            >
              <Paper
                sx={{
                  p: { xs: 1.5, md: 2 },
                  maxWidth: { xs: "85%", sm: "75%", md: "70%" },
                  bgcolor: message.role === "user" ? "primary.main" : "background.paper",
                  color: message.role === "user" ? "primary.contrastText" : "text.primary",
                }}
              >
                <Typography variant="body1" sx={{ fontSize: { xs: "0.875rem", md: "1rem" } }}>{message.content}</Typography>
                {message.agentType && (
                  <Chip
                    label={message.agentType.replace("_agent", "")}
                    size="small"
                    sx={{ mt: 1, fontSize: "0.7rem" }}
                  />
                )}
              </Paper>
            </Box>
          ))}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
            <Paper sx={{ p: { xs: 1.5, md: 2 } }}>
              <CircularProgress size={20} />
            </Paper>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* 입력 영역 */}
      <Box
        sx={{
          p: { xs: 1, sm: 1.5, md: 2 },
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="메시지를 입력하세요..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || !projectId || loadingHistory}
            size="small"
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || loading || !projectId || loadingHistory}
            sx={{ 
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "&:hover": {
                bgcolor: "primary.dark",
              },
              "&.Mui-disabled": {
                bgcolor: "action.disabledBackground",
                color: "action.disabled",
              },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}

