import React, { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { updateProject } from "../../api/projects";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function UpdateProject({ project, onUpdateSuccess, onClose }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [password, setPassword] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [loading, setLoading] = useState(false);

  // 프로젝트 정보가 들어오면 입력 필드 초기화
  useEffect(() => {
    if (project) {
      console.log("UpdateProject - project:", project);
      setTitle(project.title ?? project.name ?? "");
      setIsShared(Boolean(project.isShared));
      setPassword(project.password ?? "");
      setGithubRepo(project.githubRepo ?? project.github_url ?? "");
    }
  }, [project]);

  const mutation = useMutation({
    mutationFn: ({ projectId, update }) => updateProject({ projectId, update }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (onUpdateSuccess) onUpdateSuccess();
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("UpdateProject - handleSubmit - project:", project);
    if (!project || !project.id) {
      console.error("UpdateProject - project.id가 없습니다:", project);
      alert("프로젝트 정보가 없습니다.");
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        projectId: project.id,
        update: {
          title,
          isShared,
          password: isShared ? password : "",
          githubRepo,
        },
      };
      console.log("UpdateProject - updateData:", updateData);
      await mutation.mutateAsync(updateData);
      if (onClose) onClose();
    } catch (err) {
      console.error("프로젝트 수정 오류:", err);
      const errorMessage = err.response?.data?.error?.message || err.message || "알 수 없는 오류";
      alert("프로젝트 수정 실패: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!project || !project.id) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">프로젝트 정보를 불러올 수 없습니다.</Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
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
      </Box>
    </Box>
  );
}

