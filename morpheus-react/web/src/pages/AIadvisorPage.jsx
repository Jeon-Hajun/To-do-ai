import React, { useState } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Stack,
} from "@mui/material";
import useAuth from "../hooks/useAuth";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import ContainerBox from "../components/ui/ContainerBox";
import PageContainer from "../components/ui/PageContainer";
import { useProject } from "../context/ProjectContext";
import { useNavigate } from "react-router-dom";
import { getTaskSuggestions, getProgressAnalysis, checkTaskCompletion } from "../api/ai";
import { getTasksByProject } from "../api/task";

export default function AIadvisorPage() {
  useAuth(); // 로그인 체크
  const navigate = useNavigate();
  const { projects, loading: projectsLoading } = useProject();
  
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeFeature, setActiveFeature] = useState(null); // 'task-suggestion', 'progress-analysis', 'task-completion'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  
  // Task 완료 확인용
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");

  // 프로젝트 선택 시 Task 목록 가져오기 (Task 완료 확인용)
  React.useEffect(() => {
    if (selectedProjectId && activeFeature === 'task-completion') {
      const fetchTasks = async () => {
        try {
          const res = await getTasksByProject(selectedProjectId);
          if (res.success) {
            setTasks(res.data.tasks || []);
          }
        } catch (err) {
          console.error("Task 목록 조회 실패:", err);
        }
      };
      fetchTasks();
    }
  }, [selectedProjectId, activeFeature]);

  const handleTaskSuggestion = async () => {
    if (!selectedProjectId) {
      setError("프로젝트를 선택해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveFeature('task-suggestion');

    try {
      const res = await getTaskSuggestions(selectedProjectId, {
        includeCommits: true,
        includeIssues: true,
      });

      if (res.success) {
        // Task 제안 결과를 AI Next Step 페이지로 전달
        navigate("/ai-next-step", {
          state: {
            projectId: selectedProjectId,
            suggestions: res.data.suggestions || [],
            analysis: res.data.analysis || null,
          },
        });
      } else {
        setError(res.error?.message || "Task 제안을 받는 중 오류가 발생했습니다.");
      }
    } catch (err) {
      setError(err.message || "Task 제안을 받는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleProgressAnalysis = async () => {
    if (!selectedProjectId) {
      setError("프로젝트를 선택해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveFeature('progress-analysis');

    try {
      const res = await getProgressAnalysis(selectedProjectId);

      if (res.success) {
        setResult(res.data);
      } else {
        setError(res.error?.message || "진행도 분석 중 오류가 발생했습니다.");
      }
    } catch (err) {
      setError(err.message || "진행도 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCompletionCheck = async () => {
    if (!selectedProjectId) {
      setError("프로젝트를 선택해주세요.");
      return;
    }
    if (!selectedTaskId) {
      setError("Task를 선택해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveFeature('task-completion');

    try {
      const res = await checkTaskCompletion(selectedProjectId, selectedTaskId);

      if (res.success) {
        setResult(res.data);
      } else {
        setError(res.error?.message || "Task 완료 확인 중 오류가 발생했습니다.");
      }
    } catch (err) {
      setError(err.message || "Task 완료 확인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContainerBox>
      <Header title="AI Advisor" />

      <PageContainer
        title="AI Advisor"
        subtitle="AI 기반 추천, 분석, 조언 등을 표시합니다."
        maxWidth="md"
        sx={{ flex: 1, pt: 4 }}
      >
        <Box sx={{ mt: 4 }}>
          {/* 프로젝트 선택 */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>프로젝트 선택</InputLabel>
            <Select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setActiveFeature(null);
                setResult(null);
                setError(null);
              }}
              label="프로젝트 선택"
              disabled={projectsLoading}
            >
              {projects.length === 0 ? (
                <MenuItem disabled>프로젝트가 없습니다</MenuItem>
              ) : (
                projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.title}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {projects.length === 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              프로젝트를 먼저 생성해주세요.
            </Alert>
          )}

          {/* 기능 버튼들 */}
          <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" gap={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleTaskSuggestion}
              disabled={!selectedProjectId || loading}
              sx={{ flex: 1, minWidth: 150 }}
            >
              Task 제안 받기
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleProgressAnalysis}
              disabled={!selectedProjectId || loading}
              sx={{ flex: 1, minWidth: 150 }}
            >
              진행도 분석하기
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setActiveFeature('task-completion')}
              disabled={!selectedProjectId || loading}
              sx={{ flex: 1, minWidth: 150 }}
            >
              Task 완료 확인
            </Button>
          </Stack>

          {/* Task 완료 확인용 Task 선택 */}
          {activeFeature === 'task-completion' && selectedProjectId && (
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Task 선택</InputLabel>
                <Select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  label="Task 선택"
                >
                  {tasks.length === 0 ? (
                    <MenuItem disabled>Task가 없습니다</MenuItem>
                  ) : (
                    tasks.map((task) => (
                      <MenuItem key={task.id} value={task.id}>
                        {task.title} ({task.status})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleTaskCompletionCheck}
                disabled={!selectedTaskId || loading}
                fullWidth
                sx={{ mt: 2 }}
              >
                확인하기
              </Button>
            </Box>
          )}

          {/* 로딩 상태 */}
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2, alignSelf: "center" }}>
                AI 분석 중... 잠시만 기다려주세요.
              </Typography>
            </Box>
          )}

          {/* 에러 메시지 */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* 진행도 분석 결과 */}
          {result && activeFeature === 'progress-analysis' && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  진행도 분석 결과
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {result.predictedCompletionDate && (
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>예측 완료일:</strong> {new Date(result.predictedCompletionDate).toLocaleDateString()}
                    </Typography>
                  )}
                  {result.riskLevel && (
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>지연 위험도:</strong> {result.riskLevel}
                    </Typography>
                  )}
                  {result.suggestions && result.suggestions.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        <strong>제안사항:</strong>
                      </Typography>
                      <ul>
                        {result.suggestions.map((suggestion, index) => (
                          <li key={index}>
                            <Typography variant="body2">{suggestion}</Typography>
                          </li>
                        ))}
                      </ul>
                    </Box>
                  )}
                  {result.analysis && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        <strong>상세 분석:</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                        {result.analysis}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Task 완료 확인 결과 */}
          {result && activeFeature === 'task-completion' && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Task 완료 여부 확인 결과
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>완료 여부:</strong>{" "}
                    {result.isCompleted ? "완료됨" : result.isCompleted === false ? "미완료" : "불확실"}
                  </Typography>
                  {result.confidence !== undefined && (
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>신뢰도:</strong> {result.confidence}%
                    </Typography>
                  )}
                  {result.reasoning && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        <strong>판단 근거:</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                        {result.reasoning}
                      </Typography>
                    </Box>
                  )}
                  {result.suggestions && result.suggestions.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        <strong>제안사항:</strong>
                      </Typography>
                      <ul>
                        {result.suggestions.map((suggestion, index) => (
                          <li key={index}>
                            <Typography variant="body2">{suggestion}</Typography>
                          </li>
                        ))}
                      </ul>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </PageContainer>

      <NavBar />
    </ContainerBox>
  );
}
