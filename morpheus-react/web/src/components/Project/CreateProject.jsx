// src/components/Project/CreateProject.jsx
import React, { useState } from "react";
import { createProject } from "../../api/projects";
import { TextField, Button, FormControlLabel, Checkbox, Box } from "@mui/material";
import { useProject } from "../../context/ProjectContext";

export default function CreateProject({ onCancel, onSuccess }) {
  const { setProjects } = useProject();

  const [title, setTitle] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [password, setPassword] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await createProject({
        title,
        isShared,
        password: isShared ? password : null,
        githubRepo,
      });

      if (res.success) {
        // 새 프로젝트를 맨 위로 추가
        setProjects(prev => [res.data, ...prev]);

        // 입력 초기화
        setTitle("");
        setIsShared(false);
        setPassword("");
        setGithubRepo("");

        // 성공 콜백 (모달 닫기 등)
        if (onSuccess) onSuccess();
      } else {
        alert("프로젝트 생성 실패: " + (res.error?.message || ""));
      }
    } catch (err) {
      console.error(err);
      alert("서버 오류로 프로젝트 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <TextField
        label="프로젝트 제목"
        fullWidth
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
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
