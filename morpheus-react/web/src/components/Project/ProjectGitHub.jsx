// src/components/Project/ProjectGitHub.jsx
import React, { useState } from "react";
import { Stack, TextField, Button, CircularProgress } from "@mui/material";
import { connectGithubRepo } from "../../api/projects";
import { useProject } from "../../context/ProjectContext";

// GitHub 연결/수정 컴포넌트
export default function ProjectGitHub({ project, isOwner }) {
  const { updateProjectInContext } = useProject();
  const [githubRepoInput, setGithubRepoInput] = useState(project.githubRepo || "");
  const [loading, setLoading] = useState(false);

  const handleUpdateGithub = async () => {
    if (!isOwner) return; // 오너만 수정 가능
    setLoading(true);
    try {
      const res = await connectGithubRepo(project.id, githubRepoInput);
      if (res.success) {
        alert("GitHub 연결 완료");
        updateProjectInContext({ ...project, githubRepo: githubRepoInput }); // context 갱신
      } else alert("GitHub 연결 실패");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
      <TextField
        value={githubRepoInput}
        onChange={(e) => setGithubRepoInput(e.target.value)}
        fullWidth
        placeholder="GitHub URL"
      />
      {isOwner && (
        <Button variant="contained" onClick={handleUpdateGithub} disabled={loading}>
          {loading ? <CircularProgress size={20}/> : "연결/수정"}
        </Button>
      )}
    </Stack>
  );
}
