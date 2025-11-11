// src/components/Project/UpdateProject.jsx
import React, { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { updateProject } from "../../api/projects";

export default function UpdateProject({ project, onUpdateSuccess, onClose }) {
  const [title, setTitle] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [password, setPassword] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [loading, setLoading] = useState(false);

  // 프로젝트 정보가 들어오면 입력 필드 초기화
  useEffect(() => {
    if (project) {
      setTitle(project.title ?? project.name ?? "");
      setIsShared(Boolean(project.isShared));
      setPassword(project.password ?? "");
      setGithubRepo(project.githubRepo ?? project.github_url ?? "");
    }
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!project) return;

    setLoading(true);
    try {
      const res = await updateProject(project.id, {
        title,
        isShared,
        password: isShared ? password : "",
        githubRepo,
      });
      if (res.success) {
        onUpdateSuccess();
        onClose?.();
      } else {
        alert("프로젝트 수정 실패: " + (res.error?.message || "알 수 없는 오류"));
      }
    } catch (err) {
      console.error(err);
      alert("프로젝트 수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!project) return null;

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <TextField
        label="프로젝트 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        fullWidth
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={isShared}
            onChange={(e) => setIsShared(e.target.checked)}
          />
        }
        label="공유 프로젝트"
      />

      {isShared && (
        <TextField
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
        />
      )}

      <TextField
        label="GitHub 저장소 URL"
        value={githubRepo}
        onChange={(e) => setGithubRepo(e.target.value)}
        fullWidth
      />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button
          type="button"
          variant="outlined"
          color="secondary"
          onClick={onClose}
          disabled={loading}
        >
          취소
        </Button>
        <Button type="submit" variant="contained" color="primary" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "수정"}
        </Button>
      </div>
    </form>
  );
}
