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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Slide,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import { sendChatMessage, clearConversation, getChatHistory } from "../../api/ai";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function ChatBot({ projectId, onError }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultData, setResultData] = useState(null);
  const messagesEndRef = useRef(null);

  // 초기 제안 질문들
  const suggestionButtons = [
    { text: "진행도 알려줘", query: "진행도 알려줘", icon: "📊" },
    { text: "할 일 추천해줘", query: "할 일 추천해줘", icon: "💡" },
    { text: "이 작업 완료됐어?", query: "이 작업 완료됐어?", icon: "✅" },
    { text: "커밋 몇 개야?", query: "커밋 몇 개야?", icon: "📝" },
    { text: "Task 할당 추천해줘", query: "Task 할당 추천해줘", icon: "👤" },
  ];

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

        // Task 제안 결과가 있으면 모달로 표시
        if (res.data.response && res.data.response.type === "task_suggestions" && res.data.response.suggestions) {
          setResultData({
            type: "task_suggestions",
            suggestions: res.data.response.suggestions,
            message: res.data.message,
          });
          setResultModalOpen(true);
        }
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

  const handleSuggestionClick = async (query) => {
    if (loading || !projectId) {
      return;
    }

    setInputMessage("");
    setLoading(true);
    setError(null);

    // 사용자 메시지를 즉시 표시
    const newUserMessage = {
      role: "user",
      content: query,
      id: Date.now(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      // 대화 히스토리 준비
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const res = await sendChatMessage(projectId, query, history);

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

        // Task 제안 결과가 있으면 모달로 표시
        if (res.data.response && res.data.response.type === "task_suggestions" && res.data.response.suggestions) {
          setResultData({
            type: "task_suggestions",
            suggestions: res.data.response.suggestions,
            message: res.data.message,
          });
          setResultModalOpen(true);
        }
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

  const handleCloseResultModal = () => {
    setResultModalOpen(false);
    setResultData(null);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 500 }}>
      {/* 헤더 */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6">AI 어시스턴트</Typography>
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
          p: 2,
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
                <Typography variant="h6" sx={{ mb: 3, fontWeight: "bold" }}>
                  안녕하세요! 프로젝트 관리 AI 어시스턴트입니다.
                </Typography>
                <Typography variant="body2" sx={{ mb: 3, textAlign: "center" }}>
                  아래 버튼을 클릭하여 바로 질문하거나, 직접 입력할 수 있습니다:
                </Typography>
                <Box sx={{ width: "100%", maxWidth: 600 }}>
                  <Stack spacing={1.5} direction="row" flexWrap="wrap" justifyContent="center" useFlexGap>
                    {suggestionButtons.map((btn, index) => (
                      <Button
                        key={index}
                        variant="outlined"
                        onClick={() => handleSuggestionClick(btn.query)}
                        disabled={loading || !projectId || loadingHistory}
                        sx={{
                          borderRadius: 3,
                          px: 2,
                          py: 1,
                          textTransform: "none",
                          borderColor: "primary.main",
                          color: "primary.main",
                          "&:hover": {
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            borderColor: "primary.main",
                          },
                        }}
                        startIcon={<span>{btn.icon}</span>}
                      >
                        {btn.text}
                      </Button>
                    ))}
                  </Stack>
                </Box>
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
                  p: 2,
                  maxWidth: "70%",
                  bgcolor: message.role === "user" ? "primary.main" : "background.paper",
                  color: message.role === "user" ? "primary.contrastText" : "text.primary",
                }}
              >
                <Typography variant="body1">{message.content}</Typography>
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
            <Paper sx={{ p: 2 }}>
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
          p: 2,
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

      {/* Task 제안 결과 모달 */}
      <Dialog
        open={resultModalOpen}
        onClose={handleCloseResultModal}
        TransitionComponent={Transition}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">Task 제안 결과</Typography>
            <IconButton onClick={handleCloseResultModal} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {resultData && resultData.type === "task_suggestions" && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2, color: "text.secondary" }}>
                {resultData.message}
              </Typography>
              <List>
                {resultData.suggestions.map((suggestion, index) => (
                  <React.Fragment key={index}>
                    <ListItem
                      sx={{
                        flexDirection: "column",
                        alignItems: "flex-start",
                        py: 2,
                      }}
                    >
                      <Box sx={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                          {suggestion.title || suggestion.task || "제목 없음"}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            label={suggestion.category || "기타"}
                            size="small"
                            color={
                              suggestion.category === "security"
                                ? "error"
                                : suggestion.category === "refactor"
                                ? "warning"
                                : suggestion.category === "feature"
                                ? "primary"
                                : "default"
                            }
                          />
                          <Chip
                            label={suggestion.priority || "Low"}
                            size="small"
                            color={
                              suggestion.priority === "High"
                                ? "error"
                                : suggestion.priority === "Medium"
                                ? "warning"
                                : "default"
                            }
                          />
                        </Stack>
                      </Box>
                      {suggestion.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {suggestion.description}
                        </Typography>
                      )}
                      {suggestion.reason && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                          추천 이유: {suggestion.reason}
                        </Typography>
                      )}
                    </ListItem>
                    {index < resultData.suggestions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResultModal} variant="contained">
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

