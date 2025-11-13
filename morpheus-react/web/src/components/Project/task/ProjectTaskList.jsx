import React, { useEffect, useState } from "react";
import { Box, Typography, Stack, Button, CircularProgress, Card, CardContent, Alert, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { getTasksByProject, deleteTask } from "../../../api/task";
import { getProjectMembers } from "../../../api/projects";
import { getProgressAnalysis } from "../../../api/ai";
import ProjectTaskEdit from "./ProjectTaskEdit";
import ProjectTaskAdd from "./ProjectTaskAdd";
import ProjectTaskCard from "./ProjectTaskCard";
import { getUser } from "../../../utils/auth";

export default function ProjectTaskList({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingTask, setEditingTask] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // 진행도 분석 관련 상태
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const currentUser = getUser();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await getTasksByProject(projectId);
      if (res?.success) setTasks(res.data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await getProjectMembers(projectId);
      if (res?.success) setMembers(res.data.members || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTasks();
      fetchMembers();
    }
  }, [projectId]);

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await deleteTask(taskId);
      if (res.success) fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setEditModalOpen(true);
  };

  const handleProgressAnalysis = async () => {
    if (!projectId) return;

    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setShowAnalysis(true);

    try {
      const res = await getProgressAnalysis(projectId);

      if (res.success) {
        setAnalysisResult(res.data);
      } else {
        setAnalysisError(res.error?.message || "진행도 분석 중 오류가 발생했습니다.");
      }
    } catch (err) {
      setAnalysisError(err.message || "진행도 분석 중 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <CircularProgress sx={{ mt: 2 }} />;

  // 현재 유저가 오너인지 확인
  const owner = members.find(m => m.role === "owner");
  const isOwner = owner ? String(owner.id) === String(currentUser.id) : false;

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">작업 목록</Typography>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleProgressAnalysis}
          disabled={analyzing || !projectId}
          size="small"
        >
          {analyzing ? <CircularProgress size={20} /> : "AI 진행도 분석"}
        </Button>
      </Box>

      {/* 진행도 분석 결과 */}
      {showAnalysis && (
        <Accordion expanded={showAnalysis} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">
              AI 진행도 분석 결과
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {analyzing ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2, alignSelf: "center" }}>
                  AI 분석 중... 잠시만 기다려주세요.
                </Typography>
              </Box>
            ) : analysisError ? (
              <Alert severity="error">{analysisError}</Alert>
            ) : analysisResult ? (
              <Box>
                {analysisResult.predictedCompletionDate && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>예측 완료일:</strong>{" "}
                    {new Date(analysisResult.predictedCompletionDate).toLocaleDateString()}
                  </Typography>
                )}
                {analysisResult.riskLevel && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>지연 위험도:</strong> {analysisResult.riskLevel}
                  </Typography>
                )}
                {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      <strong>제안사항:</strong>
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {analysisResult.suggestions.map((suggestion, index) => (
                        <li key={index}>
                          <Typography variant="body2">{suggestion}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
                {analysisResult.analysis && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      <strong>상세 분석:</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {analysisResult.analysis}
                    </Typography>
                  </Box>
                )}
                {analysisResult.issues && analysisResult.issues.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      <strong>주요 이슈:</strong>
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {analysisResult.issues.map((issue, index) => (
                        <li key={index}>
                          <Typography variant="body2">{issue}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
              </Box>
            ) : null}
          </AccordionDetails>
        </Accordion>
      )}

      <Stack spacing={1}>
        {tasks.length === 0 && <Typography color="text.secondary">작업이 없습니다.</Typography>}

        {tasks.map(task => (
          <ProjectTaskCard
            key={task.id}
            task={task}
            members={members}
            currentUser={currentUser}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteTask}
          />
        ))}
      </Stack>

      {isOwner && (
        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="contained" onClick={() => setAddModalOpen(true)}>
            새 작업 추가
          </Button>
        </Box>
      )}

      <ProjectTaskEdit
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        task={editingTask}
        members={members}
        onUpdated={fetchTasks}
      />

      <ProjectTaskAdd
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        projectId={projectId}
        members={members}
        onCreated={fetchTasks}
      />
    </Box>
  );
}
