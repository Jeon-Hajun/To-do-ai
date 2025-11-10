// src/components/Project/JoinProject.jsx
import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { joinProject } from "../../api/projects";

export default function JoinProject({ onJoinSuccess, onClose }) {
  const [projectCode, setProjectCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await joinProject(projectCode, password);

      if (res.success) {
        // ✅ 상위에서 새로고침 후 모달 닫기
        if (onJoinSuccess) onJoinSuccess();
      } else {
        alert("프로젝트 참여 실패: " + (res.error?.message || "알 수 없는 오류"));
      }
    } catch (err) {
      console.error(err);
      alert("서버 오류로 프로젝트 참여 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Button variant="outlined" color="secondary" onClick={onClose}>
          취소
        </Button>

        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "프로젝트 참여"}
        </Button>
      </div>
    </form>
  );
}
