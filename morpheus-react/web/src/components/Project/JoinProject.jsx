// src/components/Project/JoinProject.jsx
import React, { useState } from "react";
import { joinProject } from "../../api/projects";

export default function JoinProject({ onJoin }) {
  const [projectCode, setProjectCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await joinProject(projectCode, password);

      if (res.success) {
        const project = res.data.project || { projectCode }; // 안전장치
        if (!project.id && project.projectCode) project.id = project.projectCode;
        if (onJoin) onJoin(project);
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
    <form onSubmit={handleSubmit}>
      <div>
        <label>프로젝트 코드</label>
        <input
          value={projectCode}
          onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
          required
        />
      </div>

      <div>
        <label>비밀번호 (공유 프로젝트용)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "참여 중..." : "프로젝트 참여"}
      </button>
    </form>
  );
}
