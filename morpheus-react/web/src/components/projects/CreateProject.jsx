import React, { useState } from "react";
import { createProject, createProjectWithAI } from "../../api/projects";
import { TextField, Button, FormControlLabel, Checkbox, Box, Alert, CircularProgress, Tabs, Tab, Paper } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import MarkdownRenderer from "../common/MarkdownRenderer";

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
  const [aiSuccess, setAiSuccess] = useState(false);
  const [descriptionTab, setDescriptionTab] = useState(0); // 0: 작성, 1: 미리보기

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
        setAiSuccess(true);
        setDescriptionTab(1); // 미리보기 탭으로 전환
        // 3초 후 성공 메시지 자동 숨김
        setTimeout(() => setAiSuccess(false), 3000);
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

      {aiSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAiSuccess(false)}>
          AI가 프로젝트 정보를 생성했습니다. 내용을 확인한 후 "프로젝트 생성" 버튼을 눌러주세요.
        </Alert>
      )}
      
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

      <Box sx={{ mt: 2 }}>
        <Tabs 
          value={descriptionTab} 
          onChange={(e, newValue) => setDescriptionTab(newValue)}
          sx={{ mb: 1 }}
        >
          <Tab label="작성" />
          <Tab label="미리보기" />
        </Tabs>
        
        {descriptionTab === 0 ? (
          <TextField
            label="프로젝트 설명"
            fullWidth
            multiline
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`## 프로젝트 목적
이 프로젝트의 목표와 배경을 설명해주세요.

## 주요 기능
- 기능 1
- 기능 2
- 기능 3

## 기술 스택
- **프론트엔드**: React, TypeScript
- **백엔드**: Node.js, Express
- **데이터베이스**: MySQL

## 기간/일정
- 시작일: 2024년 1월
- 마감일: 2024년 3월
- 주요 마일스톤: 설계 완료, MVP 개발, 테스트`}
            helperText="마크다운 형식을 사용할 수 있습니다. 제목(#), 리스트(-), 굵게(**텍스트**), 코드(`코드`) 등을 활용해보세요."
            sx={{ mt: 1 }}
          />
        ) : (
          <Paper 
            sx={{ 
              p: 2, 
              minHeight: 200, 
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1
            }}
          >
            {description ? (
              <MarkdownRenderer content={description} />
            ) : (
              <Box sx={{ color: "text.secondary", fontStyle: "italic", textAlign: "center", py: 4 }}>
                작성한 내용이 여기에 표시됩니다.
              </Box>
            )}
          </Paper>
        )}
      </Box>

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
