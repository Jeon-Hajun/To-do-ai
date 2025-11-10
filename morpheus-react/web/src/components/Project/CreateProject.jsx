import React, { useState } from "react";
import { createProject } from "../../api/projects";
import { TextField, Button, FormControlLabel, Checkbox, Box, Typography } from "@mui/material";

export default function CreateProject({ onCreateSuccess }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
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
        description,
        isShared,
        password: isShared ? password : null,
        githubRepo,
      });

      if (res.success && onCreateSuccess) {
        onCreateSuccess(res.data); // 모달 닫기 + 프로젝트 새로고침
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
      <Typography variant="h6" sx={{ mb: 2 }}>프로젝트 생성</Typography>

      <TextField
        label="프로젝트 제목"
        fullWidth
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        margin="normal"
      />

      <TextField
        label="설명"
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

      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={loading}
        sx={{ mt: 3 }}
      >
        {loading ? "생성 중..." : "프로젝트 생성"}
      </Button>
    </Box>
  );
}
