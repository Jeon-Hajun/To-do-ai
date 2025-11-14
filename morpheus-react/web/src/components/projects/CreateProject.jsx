import React, { useState } from "react";
import { createProject } from "../../api/projects";
import { TextField, Button, FormControlLabel, Checkbox, Box } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function CreateProject({ onCancel, onSuccess }) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [password, setPassword] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await mutation.mutateAsync({
        title,
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
