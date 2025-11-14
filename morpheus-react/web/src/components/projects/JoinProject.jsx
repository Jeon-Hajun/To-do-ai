import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { joinProject } from "../../api/projects";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function JoinProject({ onJoinSuccess, onClose }) {
  const queryClient = useQueryClient();
  const [projectCode, setProjectCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const mutation = useMutation({
    mutationFn: ({ projectCode, password }) => joinProject({ projectCode, password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setProjectCode("");
      setPassword("");
      if (onJoinSuccess) onJoinSuccess();
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await mutation.mutateAsync({ projectCode, password });
    } catch (err) {
      console.error(err);
      alert("프로젝트 참여 실패: " + (err.response?.data?.error?.message || err.message || "알 수 없는 오류"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        label="프로젝트 코드"
        value={projectCode}
        onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
        fullWidth
        required
      />

      <TextField
        label="비밀번호 (공유 프로젝트용)"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
      />

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button variant="outlined" color="secondary" onClick={onClose}>
          취소
        </Button>

        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "프로젝트 참여"}
        </Button>
      </Box>
    </Box>
  );
}
