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
  Divider,
  Slide,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import { sendChatMessage, clearConversation, getChatHistory } from "../../api/ai";
import { createTask } from "../../api/tasks";
import { useQueryClient } from "@tanstack/react-query";
import MarkdownRenderer from "../common/MarkdownRenderer";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function ChatBot({ projectId, onError }) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [addingTasks, setAddingTasks] = useState(new Set());
  const [addedTasks, setAddedTasks] = useState(new Set()); // 추가된 Task 추적
  const messagesEndRef = useRef(null);

  // 초기 제안 질문들
  const suggestionButtons = [
    { text: "진행도 알려줘", query: "진행도 알려줘", icon: "📊" },
    { text: "Task 제안", query: "할 일 추천해줘", icon: "💡" },
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
      // 프로젝트 변경 시 메시지와 상태 초기화
      setMessages([]);
      setConversationId(null);
      setResultModalOpen(false);
      setResultData(null);
      setInputMessage("");
      setError(null);
      setAddedTasks(new Set()); // 추가된 Task 추적도 초기화
      // 히스토리 로드
      loadHistory();
    } else {
      setMessages([]);
      setConversationId(null);
      setResultModalOpen(false);
      setResultData(null);
      setAddedTasks(new Set());
    }
  }, [projectId]);

  const loadHistory = async () => {
    if (!projectId) return;

    setLoadingHistory(true);
    try {
      const res = await getChatHistory(projectId);
      if (res.success && res.data) {
        setConversationId(res.data.conversationId);
        // 메시지가 있으면 설정, 없으면 빈 배열 유지
        if (res.data.messages && res.data.messages.length > 0) {
          const formattedMessages = res.data.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            agentType: msg.agentType,
            // response는 저장되지 않으므로 재구성 필요 없음
          }));
          setMessages(formattedMessages);
        } else {
          // 메시지가 없으면 빈 배열로 설정
          setMessages([]);
        }
      } else {
        // 응답이 없거나 실패한 경우 빈 배열로 설정
        setMessages([]);
      }
    } catch (err) {
      console.error("대화 히스토리 로드 실패:", err);
      // 에러 발생 시에도 빈 배열로 설정
      setMessages([]);
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

    // 진행 상황 메시지를 표시할 임시 메시지 ID
    let progressMessageId = null;

    try {
      // 대화 히스토리 준비 (현재 메시지 제외)
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // 진행 상황 표시를 위한 임시 메시지 추가
      progressMessageId = Date.now() + 1000;
      const progressMessage = {
        role: "assistant",
        content: "🔍 분석을 시작합니다...",
        id: progressMessageId,
        isProgress: true,
      };
      setMessages((prev) => [...prev, progressMessage]);

      const res = await sendChatMessage(projectId, userMessage, history);

      if (res.success) {
        // GitHub 연동 필요 에러 체크
        if (res.data.error === "GITHUB_REQUIRED") {
          const errorMessage = {
            role: "assistant",
            content: res.data.response?.message || "GitHub 저장소가 연결되어 있지 않습니다.",
            id: Date.now() + 2,
          };
          setMessages((prev) => {
            const filtered = prev.filter((msg) => msg.id !== progressMessageId);
            return [...filtered, errorMessage];
          });
          return;
        }

        // 진행 상황 메시지가 있으면 표시
        const progressMessages = res.data.progress_messages || [];
        
        // 진행 상황 메시지들을 채팅에 추가 (모든 진행 메시지 표시)
        if (progressMessages.length > 0) {
          // 진행 메시지들을 모두 추가 (최근 3개만 표시)
          setMessages((prev) => {
            // 기존 진행 메시지 제거
            const filtered = prev.filter(msg => !msg.isProgress || msg.id === progressMessageId);
            
            // 새로운 진행 메시지들 추가 (모든 메시지 표시)
            const recentProgressMessages = progressMessages.map((msg, idx) => ({
              role: "assistant",
              content: msg,
              id: progressMessageId + idx + 1,
              isProgress: true,
            }));
            
            return [...filtered, ...recentProgressMessages];
          });
        }

        // Task 제안 결과가 있으면 채팅 메시지로 표시 (일반 메시지 추가 전에 처리)
        if (res.data.response && res.data.response.type === "task_suggestions" && res.data.response.suggestions) {
          // Task 제안 결과를 채팅 메시지로 표시
          const taskSuggestionMessage = {
            role: "assistant",
            content: res.data.message || "Task 제안이 완료되었습니다.",
            agentType: "task_suggestion_agent",
            response: res.data.response,
            id: Date.now() + 2,
          };
          setMessages((prev) => {
            const filtered = prev.filter((msg) => !msg.isProgress);
            return [...filtered, taskSuggestionMessage];
          });
        }
        // needs_more_info 응답 처리
        else if (res.data.response && res.data.response.type === "needs_more_info") {
        // needs_more_info 응답의 경우 response.message를 우선 사용
          const messageContent = res.data.response.message || res.data.message;
          const assistantMessage = {
            role: "assistant",
            content: messageContent,
            agentType: res.data.agentType || res.data.agent_type,
            response: res.data.response,
            id: Date.now() + 2,
          };
          setMessages((prev) => {
            const filtered = prev.filter((msg) => !msg.isProgress);
            return [...filtered, assistantMessage];
          });
        }
        // 일반 응답 메시지 추가
        else {
          const messageContent = res.data.message || res.data.response?.message;
        const assistantMessage = {
          role: "assistant",
          content: messageContent,
          agentType: res.data.agentType || res.data.agent_type, // 백엔드 응답 형식에 맞춤
          response: res.data.response,
          id: Date.now() + 2,
        };
        
        // 진행 상황 메시지 제거하고 최종 응답 추가 (중복 방지)
        setMessages((prev) => {
          const filtered = prev.filter((msg) => !msg.isProgress);
          // 이미 같은 내용의 메시지가 있는지 확인
          const isDuplicate = filtered.some(
            (msg) => msg.role === "assistant" && 
                     msg.content === assistantMessage.content &&
                     msg.agentType === assistantMessage.agentType
          );
          if (!isDuplicate) {
            return [...filtered, assistantMessage];
          }
          return filtered;
        });
        }
        
        setConversationId(res.data.conversationId);
      } else {
        // 에러 처리 - 채팅 메시지로 표시
        const errorMessage = {
          role: "assistant",
          content: res.error?.message || res.data?.message || "메시지 전송에 실패했습니다. 다시 시도해주세요.",
          id: Date.now() + 2,
        };
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== progressMessageId);
          return [...filtered, errorMessage];
        });
        if (onError) {
          onError(res.error);
        }
      }
    } catch (err) {
      console.error("메시지 전송 오류:", err);
      // 에러 처리 - 채팅 메시지로 표시
      const errorMessage = {
        role: "assistant",
        content: err.message || "메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.",
        id: Date.now() + 2,
      };
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== progressMessageId);
        return [...filtered, errorMessage];
      });
      if (onError) {
        onError({ message: err.message });
      }
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

    // 진행 상황 메시지를 표시할 임시 메시지 ID
    let progressMessageId = null;

    try {
      // 대화 히스토리 준비
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // 진행 상황 표시를 위한 임시 메시지 추가
      progressMessageId = Date.now() + 1000;
      const progressMessage = {
        role: "assistant",
        content: "🔍 분석을 시작합니다...",
        id: progressMessageId,
        isProgress: true,
      };
      setMessages((prev) => [...prev, progressMessage]);

      const res = await sendChatMessage(projectId, query, history);

      if (res.success) {
        // GitHub 연동 필요 에러 체크
        if (res.data.error === "GITHUB_REQUIRED") {
          const errorMessage = {
            role: "assistant",
            content: res.data.response?.message || "GitHub 저장소가 연결되어 있지 않습니다.",
            id: Date.now() + 2,
          };
          setMessages((prev) => {
            const filtered = prev.filter((msg) => msg.id !== progressMessageId);
            return [...filtered, errorMessage];
          });
          return;
        }

        // 진행 상황 메시지가 있으면 표시
        const progressMessages = res.data.progress_messages || [];
        
        // 진행 상황 메시지들을 채팅에 추가 (모든 진행 메시지 표시)
        if (progressMessages.length > 0) {
          // 진행 메시지들을 모두 추가 (최근 3개만 표시)
          setMessages((prev) => {
            // 기존 진행 메시지 제거
            const filtered = prev.filter(msg => !msg.isProgress || msg.id === progressMessageId);
            
            // 새로운 진행 메시지들 추가 (모든 메시지 표시)
            const recentProgressMessages = progressMessages.map((msg, idx) => ({
              role: "assistant",
              content: msg,
              id: progressMessageId + idx + 1,
              isProgress: true,
            }));
            
            return [...filtered, ...recentProgressMessages];
          });
        }

        // Task 제안 결과가 있으면 채팅 메시지로 표시 (일반 메시지 추가 전에 처리)
        if (res.data.response && res.data.response.type === "task_suggestions" && res.data.response.suggestions) {
          // Task 제안 결과를 채팅 메시지로 표시
          const taskSuggestionMessage = {
            role: "assistant",
            content: res.data.message || "Task 제안이 완료되었습니다.",
            agentType: "task_suggestion_agent",
            response: res.data.response,
            id: Date.now() + 2,
          };
          setMessages((prev) => {
            const filtered = prev.filter((msg) => !msg.isProgress);
            return [...filtered, taskSuggestionMessage];
          });
        }
        // needs_more_info 응답 처리
        else if (res.data.response && res.data.response.type === "needs_more_info") {
        // needs_more_info 응답의 경우 response.message를 우선 사용
          const messageContent = res.data.response.message || res.data.message;
          const assistantMessage = {
            role: "assistant",
            content: messageContent,
            agentType: res.data.agentType || res.data.agent_type,
            response: res.data.response,
            id: Date.now() + 2,
          };
          setMessages((prev) => {
            const filtered = prev.filter((msg) => !msg.isProgress);
            return [...filtered, assistantMessage];
          });
        }
        // 일반 응답 메시지 추가
        else {
          const messageContent = res.data.message || res.data.response?.message;
        const assistantMessage = {
          role: "assistant",
          content: messageContent,
          agentType: res.data.agentType || res.data.agent_type, // 백엔드 응답 형식에 맞춤
          response: res.data.response,
          id: Date.now() + 2,
        };
        
        // 진행 상황 메시지 제거하고 최종 응답 추가 (중복 방지)
        setMessages((prev) => {
          const filtered = prev.filter((msg) => !msg.isProgress);
          // 이미 같은 내용의 메시지가 있는지 확인
          const isDuplicate = filtered.some(
            (msg) => msg.role === "assistant" && 
                     msg.content === assistantMessage.content &&
                     msg.agentType === assistantMessage.agentType
          );
          if (!isDuplicate) {
            return [...filtered, assistantMessage];
          }
          return filtered;
        });
        }
        
        setConversationId(res.data.conversationId);
      } else {
        // 에러 처리 - 채팅 메시지로 표시
        const errorMessage = {
          role: "assistant",
          content: res.error?.message || res.data?.message || "메시지 전송에 실패했습니다. 다시 시도해주세요.",
          id: Date.now() + 2,
        };
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== progressMessageId);
          return [...filtered, errorMessage];
        });
        if (onError) {
          onError(res.error);
        }
      }
    } catch (err) {
      console.error("메시지 전송 오류:", err);
      // 에러 처리 - 채팅 메시지로 표시
      const errorMessage = {
        role: "assistant",
        content: err.message || "메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.",
        id: Date.now() + 2,
      };
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== progressMessageId);
        return [...filtered, errorMessage];
      });
      if (onError) {
        onError({ message: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseResultModal = () => {
    setResultModalOpen(false);
    setResultData(null);
  };

  const handleAddTask = async (suggestion, index) => {
    if (!projectId || addingTasks.has(index) || addedTasks.has(index)) return;

    const taskTitle = suggestion.title || suggestion.task || "제목 없음";
    const taskDescription = suggestion.description || "";

    setAddingTasks((prev) => new Set(prev).add(index));

    try {
      await createTask({
        projectId,
        title: taskTitle,
        description: taskDescription,
        dueDate: null,
        assignedUserId: null,
      });

      // Task 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });

      // 추가된 Task로 표시
      setAddedTasks((prev) => new Set(prev).add(index));

      // 성공 메시지 표시
      alert(`"${taskTitle}" Task가 추가되었습니다.`);
    } catch (err) {
      console.error("Task 추가 실패:", err);
      alert(`Task 추가 실패: ${err.message || "알 수 없는 오류"}`);
    } finally {
      setAddingTasks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
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
                <Typography variant="h6" sx={{ mb: 3, fontWeight: "bold", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                  안녕하세요! 프로젝트 관리 AI 어시스턴트입니다.
                </Typography>
                <Typography variant="body2" sx={{ mb: 3, textAlign: "center", fontSize: { xs: "0.8rem", md: "0.875rem" } }}>
                  아래 버튼을 클릭하여 바로 질문하거나, 직접 입력할 수 있습니다:
                </Typography>
                <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 600 } }}>
                  <Stack spacing={1.5} direction="row" flexWrap="wrap" justifyContent="center" useFlexGap>
                    {suggestionButtons.map((btn, index) => (
                      <Button
                        key={index}
                        variant="outlined"
                        onClick={() => handleSuggestionClick(btn.query)}
                        disabled={loading || !projectId || loadingHistory}
                        sx={{
                          borderRadius: 3,
                          px: { xs: 1.5, md: 2 },
                          py: { xs: 0.75, md: 1 },
                          textTransform: "none",
                          fontSize: { xs: "0.75rem", md: "0.875rem" },
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
                  p: { xs: 1.5, md: 2 },
                  maxWidth: { xs: "85%", sm: "75%", md: "70%" },
                  bgcolor: message.role === "user" ? "primary.main" : "background.paper",
                  color: message.role === "user" ? "primary.contrastText" : "text.primary",
                  opacity: message.isProgress ? 0.8 : 1,
                }}
              >
                {message.isProgress ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" sx={{ fontSize: { xs: "0.8rem", md: "0.875rem" } }}>{message.content}</Typography>
                  </Box>
                ) : (message.agentType === "progress_analysis_agent" || 
                      message.agentType === "progress_analysis" ||
                      (message.response && message.response.type === "progress_analysis")) ? (
                  <MarkdownRenderer content={message.content} />
                ) : (message.response && message.response.type === "needs_more_info") ? (
                  <Box>
                    <MarkdownRenderer content={message.content} />
                    {message.response.questions && message.response.questions.length > 0 && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                          다음 정보를 제공해주세요:
                        </Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                          {message.response.questions.map((question, index) => (
                            <Typography
                              key={index}
                              component="li"
                              variant="body2"
                              sx={{ mb: 0.5, fontSize: { xs: "0.8rem", md: "0.875rem" } }}
                            >
                              {question}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                ) : (message.agentType === "task_suggestion_agent" ||
                      (message.response && message.response.type === "task_suggestions")) ? (
                  <Box>
                    {/* Task 제안인 경우 프로젝트 이름과 제목만 표시, 상세 목록은 카드로만 표시 */}
                    {message.content && (() => {
                      // 프로젝트 이름과 "💡 N개의 Task를 제안했습니다" 부분만 추출
                      const lines = message.content.split('\n');
                      let headerLines = [];
                      for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line.startsWith('# ') || line.startsWith('## 💡')) {
                          headerLines.push(lines[i]);
                        } else if (headerLines.length > 0 && (line.startsWith('###') || line.startsWith('---') || line.startsWith('💡 각 Task를'))) {
                          break;
                        } else if (headerLines.length > 0 && line === '') {
                          headerLines.push(lines[i]);
                        }
                      }
                      const headerContent = headerLines.length > 0 ? headerLines.join('\n') : '';
                      return headerContent ? (
                        <Box sx={{ mb: 2 }}>
                          <MarkdownRenderer content={headerContent} />
                        </Box>
                      ) : null;
                    })()}
                    {message.response && message.response.suggestions && message.response.suggestions.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        {message.response.suggestions.map((suggestion, index) => {
                          const globalIndex = message.id + index;
                          const isAdded = addedTasks.has(globalIndex);
                          const isAdding = addingTasks.has(globalIndex);
                          return (
                            <Box
                              key={index}
                              sx={{
                                p: 1.5,
                                mb: 1,
                                border: 1,
                                borderColor: "divider",
                                borderRadius: 1,
                                bgcolor: "background.default",
                              }}
                            >
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: "bold", flex: 1 }}>
                                  {suggestion.title || "제목 없음"}
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip
                                    label={suggestion.category || "기타"}
                                    size="small"
                                    sx={{ fontSize: "0.7rem" }}
                                  />
                                  {isAdded ? (
                                    <Chip
                                      label="추가됨"
                                      size="small"
                                      color="success"
                                      sx={{ fontSize: "0.7rem" }}
                                    />
                                  ) : (
                                    <Button
                                      variant="contained"
                                      size="small"
                                      startIcon={isAdding ? <CircularProgress size={14} /> : <AddIcon />}
                                      onClick={() => handleAddTask(suggestion, globalIndex)}
                                      disabled={isAdding || !projectId}
                                      sx={{ fontSize: "0.7rem", px: 1, py: 0.5 }}
                                    >
                                      {isAdding ? "추가 중..." : "추가"}
                                    </Button>
                                  )}
                                </Stack>
                              </Box>
                              {suggestion.description && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                  {suggestion.description}
                                </Typography>
                              )}
                              <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  우선순위: {suggestion.priority || "Low"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  예상 시간: {suggestion.estimatedHours || 0}시간
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body1" component="div" sx={{ fontSize: { xs: "0.875rem", md: "1rem" } }}>
                    {message.content}
                  </Typography>
                )}
                {message.agentType && !message.isProgress && (
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
                        <Typography variant="h6" sx={{ fontWeight: "bold", flex: 1 }}>
                          {suggestion.title || suggestion.task || "제목 없음"}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
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
                          {addedTasks.has(index) ? (
                            <Chip
                              label="추가됨"
                              size="small"
                              color="success"
                              sx={{ ml: 1 }}
                            />
                          ) : (
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={addingTasks.has(index) ? <CircularProgress size={16} /> : <AddIcon />}
                              onClick={() => handleAddTask(suggestion, index)}
                              disabled={addingTasks.has(index) || !projectId}
                              sx={{ ml: 1 }}
                            >
                              {addingTasks.has(index) ? "추가 중..." : "추가"}
                            </Button>
                          )}
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

