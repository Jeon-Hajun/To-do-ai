// src/components/Project/CreateProject.jsx
import React, { useState } from "react";
import axios from "axios";
import CodeGenerator from "./CodeGenerator"; // 기존 코드 제너레이터 import

export default function CreateProject() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [password, setPassword] = useState("");
  const [codeId, setCodeId] = useState(null); // CodeGenerator에서 전달받은 codeId

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/projects/create",
        {
          title,
          description,
          githubRepo,
          isShared,
          password,
          codeId, // CodeGenerator에서 받아온 코드 ID
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        alert("프로젝트가 생성되었습니다!");
        // 초기화
        setTitle("");
        setDescription("");
        setGithubRepo("");
        setIsShared(false);
        setPassword("");
        setCodeId(null);
      } else {
        alert("프로젝트 생성 실패");
      }
    } catch (err) {
      console.error(err);
      alert("서버 오류로 프로젝트 생성 실패");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>프로젝트 제목:</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label>설명:</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label>GitHub 저장소:</label>
        <input value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} />
      </div>
      <div>
        <label>
          <input type="checkbox" checked={isShared} onChange={() => setIsShared(!isShared)} />
          공유 프로젝트
        </label>
      </div>
      {isShared && (
        <div>
          <label>비밀번호:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      )}

      {/* CodeGenerator 컴포넌트 불러오기 */}
      <CodeGenerator onCodeReady={(id) => setCodeId(id)} />

      <div style={{ marginTop: "12px" }}>
        <button type="submit">프로젝트 생성</button>
      </div>
    </form>
  );
}
