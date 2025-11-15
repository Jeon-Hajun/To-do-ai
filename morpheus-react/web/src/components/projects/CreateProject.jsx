import React, { useState } from "react";
import { createProject, createProjectWithAI } from "../../api/projects";
import { TextField, Button, FormControlLabel, Checkbox, Box, Alert, CircularProgress } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

export default function CreateProject({ onCancel, onSuccess }) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [password, setPassword] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAIInput, setShowAIInput] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const mutation = useMutation({
    mutationFn: (newProject) => createProject(newProject),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setTitle("");
      setIsShared(false);
      setPassword("");
      setGithubRepo("");
      if (onSuccess) onSuccess();
    },
  });

  const handleAIGenerate = async () => {
    if (!aiInput.trim()) {
      setAiError("자연어 입력이 필요합니다.");
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const res = await createProjectWithAI(aiInput.trim());
      if (res.success && res.data) {
        setTitle(res.data.title || "");
        setDescription(res.data.description || "");
        setShowAIInput(false);
        setAiInput("");
      } else {
        setAiError(res.error?.message || "AI 생성에 실패했습니다.");
      }
    } catch (err) {
      console.error("AI 프로젝트 생성 오류:", err);
      setAiError(err.response?.data?.error?.message || err.message || "AI 생성 중 오류가 발생했습니다.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await mutation.mutateAsync({
        title,
        description: description || null,
        isShared,
        password: isShared ? password : null,
        githubRepo: githubRepo || null,
      });
    } catch (err) {
      console.error(err);
      alert("프로젝트 생성 실패: " + (err.response?.data?.error?.message || err.message || "알 수 없는 오류"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <TextField
          label="프로젝트 제목"
          fullWidth
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          type="button"
          variant="outlined"
          startIcon={<AutoAwesomeIcon />}
          onClick={() => {
            setShowAIInput(!showAIInput);
            setAiError(null);
          }}
          sx={{ minWidth: 140 }}
        >
          AI로 생성하기
        </Button>
      </Box>

      {showAIInput && (
        <Box sx={{ mb: 2, p: 2, bgcolor: "background.default", borderRadius: 1 }}>
          <TextField
            label="자연어로 프로젝트 설명"
            placeholder="예: React로 쇼핑몰 만들기, 웹사이트 프로젝트"
            fullWidth
            multiline
            rows={3}
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            sx={{ mb: 1 }}
          />
          {aiError && (
            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setAiError(null)}>
              {aiError}
            </Alert>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              type="button"
              variant="contained"
              onClick={handleAIGenerate}
              disabled={aiLoading || !aiInput.trim()}
              startIcon={aiLoading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
            >
              {aiLoading ? "생성 중..." : "생성하기"}
            </Button>
            <Button
              type="button"
              variant="outlined"
              onClick={() => {
                setShowAIInput(false);
                setAiInput("");
                setAiError(null);
              }}
            >
              취소
            </Button>
          </Box>
        </Box>
      )}

      <TextField
        label="프로젝트 설명"
        fullWidth
        multiline
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        margin="normal"
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={isShared}
            onChange={(e) => setIsShared(e.target.checked)}
          />
        }
        label="공유 프로젝트"
        sx={{ mt: 1 }}
      />

      {isShared && (
        <TextField
          label="비밀번호"
          type="password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
        />
      )}

      <TextField
        label="GitHub Repository"
        fullWidth
        value={githubRepo}
        onChange={(e) => setGithubRepo(e.target.value)}
        margin="normal"
      />

      <Box sx={{ display: "flex", gap: 1, mt: 3 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{ flex: 1 }}
        >
          {loading ? "생성 중..." : "프로젝트 생성"}
        </Button>
        <Button
          type="button"
          variant="outlined"
          sx={{ flex: 1 }}
          onClick={onCancel}
        >
          취소
        </Button>
      </Box>
    </Box>
  );
}
