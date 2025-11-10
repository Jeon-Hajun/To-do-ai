// src/components/Project/CreateProject.jsx
import React, { useState } from "react";
import { getToken } from "../../utils/auth";
import axios from "axios";

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
    const token = getToken();
    if (!token) throw new Error("로그인이 필요합니다.");

    const res = await axios.post(
      "http://localhost:5000/api/project/create",
      {
        title,
        description,
        isShared,
        password: isShared ? password : null,
        githubRepo,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.data?.success) {
      let project = res.data.data; // <-- 서버 반환 데이터 그대로

      // id가 없으면 projectCode로 임시 id 설정
      if (project && !project.id && project.projectCode) {
        project.id = project.projectCode;
      }

      if (onCreateSuccess) onCreateSuccess(project);
    } else {
      alert("프로젝트 생성 실패: " + (res.data?.error?.message || "알 수 없는 오류"));
    }
  } catch (err) {
    console.error(err);
    alert("서버 오류로 프로젝트 생성 실패");
  } finally {
    setLoading(false);
  }
};

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>프로젝트 제목</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label>설명</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label>
          <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
          공유 프로젝트
        </label>
      </div>
      {isShared && (
        <div>
          <label>비밀번호</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      )}
      <div>
        <label>GitHub 저장소 URL</label>
        <input value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "생성 중..." : "프로젝트 생성"}
      </button>
    </form>
  );
}
