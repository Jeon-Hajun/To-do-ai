import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from "@mui/material";
import useAuth from "../hooks/useAuth";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import ContainerBox from "../components/ui/ContainerBox";
import PageContainer from "../components/ui/PageContainer";
import { createTask } from "../api/task";
import { getProjects } from "../api/projects";

export default function AINextStepPage() {
  useAuth(); // 로그인 체크
  const navigate = useNavigate();
  const location = useLocation();
  
  const [projectId, setProjectId] = useState(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [filterPriority, setFilterPriority] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [creatingTaskId, setCreatingTaskId] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    // location.state에서 데이터 가져오기
    if (location.state) {
      setProjectId(location.state.projectId);
      setSuggestions(location.state.suggestions || []);
      setAnalysis(location.state.analysis || null);
    } else {
      // state가 없으면 AI Advisor로 리다이렉트
      navigate("/aiadvisor");
    }
  }, [location.state, navigate]);

  // 프로젝트 정보 가져오기
  useEffect(() => {
    if (projectId) {
      const fetchProject = async () => {
        try {
          const res = await getProjects(projectId);
          if (res.success && res.data?.project) {
            setProjectTitle(res.data.project.title);
          }
        } catch (err) {
          console.error("프로젝트 조회 실패:", err);
        }
      };
      fetchProject();
    }
  }, [projectId]);

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "default";
    }
  };

  const getPriorityOrder = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return 1;
      case "medium":
        return 2;
      case "low":
        return 3;
      default:
        return 4;
    }
  };

  // 필터링 및 정렬된 제안 목록
  const filteredAndSortedSuggestions = React.useMemo(() => {
    let filtered = suggestions;

    // 우선순위 필터
    if (filterPriority !== "all") {
      filtered = filtered.filter(
        (s) => s.priority?.toLowerCase() === filterPriority.toLowerCase()
      );
    }

    // 정렬
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "priority") {
        return getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
      } else if (sortBy === "estimatedHours") {
        return (a.estimatedHours || 0) - (b.estimatedHours || 0);
      }
      return 0;
    });

    return sorted;
  }, [suggestions, filterPriority, sortBy]);

  const handleCreateTask = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setTaskTitle(suggestion.title || "");
    setTaskDescription(suggestion.description || "");
    setCreateDialogOpen(true);
  };

  const handleConfirmCreateTask = async () => {
    if (!taskTitle.trim()) {
      setError("Task 제목을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createTask(projectId, {
        title: taskTitle,
        description: taskDescription,
        assignedUserId: null,
        dueDate: null,
      });

      if (res.success) {
        setCreateDialogOpen(false);
        setSelectedSuggestion(null);
        setTaskTitle("");
        setTaskDescription("");
        // 성공 메시지 표시 후 목록에서 제거 (선택사항)
        setSuggestions((prev) =>
          prev.filter((s) => s !== selectedSuggestion)
        );
        setSuccessMessage("Task가 성공적으로 생성되었습니다!");
      } else {
        setError(res.error?.message || "Task 생성에 실패했습니다.");
      }
    } catch (err) {
      setError(err.message || "Task 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) {
    return (
      <ContainerBox>
        <Header title="AI Next Step" />
        <PageContainer title="로딩 중..." maxWidth="sm" sx={{ flex: 1, pt: 4 }}>
          <CircularProgress />
        </PageContainer>
        <NavBar />
      </ContainerBox>
    );
  }

  return (
    <ContainerBox>
      <Header title="AI Next Step" />

      <PageContainer
        title={`${projectTitle} - AI Task 제안`}
        subtitle="AI가 분석한 새로운 Task 제안입니다."
        maxWidth="md"
        sx={{ flex: 1, pt: 4 }}
      >
        <Box sx={{ mt: 4 }}>
          {/* 분석 요약 */}
          {analysis && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                분석 요약
              </Typography>
              <Typography variant="body2">{analysis}</Typography>
            </Alert>
          )}

          {/* 필터 및 정렬 */}
          <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" gap={2}>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>우선순위 필터</InputLabel>
              <Select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                label="우선순위 필터"
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>정렬 기준</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="정렬 기준"
              >
                <MenuItem value="priority">우선순위</MenuItem>
                <MenuItem value="estimatedHours">예상 시간</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* 에러 메시지 */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Task 제안 목록 */}
          {filteredAndSortedSuggestions.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
              제안된 Task가 없습니다.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {filteredAndSortedSuggestions.map((suggestion, index) => (
                <Card key={index}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {suggestion.title}
                        </Typography>
                        {suggestion.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {suggestion.description}
                          </Typography>
                        )}
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          {suggestion.priority && (
                            <Chip
                              label={`우선순위: ${suggestion.priority}`}
                              color={getPriorityColor(suggestion.priority)}
                              size="small"
                            />
                          )}
                          {suggestion.estimatedHours && (
                            <Chip
                              label={`예상 시간: ${suggestion.estimatedHours}시간`}
                              variant="outlined"
                              size="small"
                            />
                          )}
                        </Stack>
                      </Box>
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleCreateTask(suggestion)}
                      disabled={loading}
                    >
                      Task로 추가
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {/* 뒤로가기 버튼 */}
          <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
            <Button variant="outlined" onClick={() => navigate("/aiadvisor")}>
              AI Advisor로 돌아가기
            </Button>
          </Box>
        </Box>
      </PageContainer>

      {/* Task 생성 다이얼로그 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Task 생성</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task 제목"
            fullWidth
            variant="standard"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Task 설명"
            fullWidth
            multiline
            rows={4}
            variant="standard"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>취소</Button>
          <Button onClick={handleConfirmCreateTask} variant="contained" disabled={loading || !taskTitle.trim()}>
            {loading ? <CircularProgress size={20} /> : "생성"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 성공 메시지 Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: "100%" }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <NavBar />
    </ContainerBox>
  );
}
