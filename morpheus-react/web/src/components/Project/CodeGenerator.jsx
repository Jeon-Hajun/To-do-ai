// src/components/Project/CodeGenerator.jsx
import React, { useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../../config/api";

export default function CodeGenerator({ onCodeReady }) {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");

  const generateAndSaveCode = async () => {
    setLoading(true);
    try {
      // 6자리 코드 생성
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let newCode = "";
      for (let i = 0; i < 6; i++) {
        newCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // DB에 바로 저장
      const res = await axios.post(`${API_ENDPOINTS.PROJECT}/create`, {
        title: `Project-${newCode}`, // 제목은 임시로 코드 기반
        description: "자동 생성 프로젝트",
        projectCode: newCode,
      });

      if (res.data.success) {
        setCode(newCode);              // 화면에 코드 표시
        onCodeReady(res.data.data.id); // 부모에게 projectId 전달
      } else {
        alert("코드 생성 실패");
      }
    } catch (err) {
      console.error(err);
      alert("서버 오류로 코드 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: "12px" }}>
      <button onClick={generateAndSaveCode} disabled={loading}>
        {loading ? "생성 중..." : "프로젝트 코드 생성"}
      </button>
      {code && <div>생성된 코드: <strong>{code}</strong></div>}
    </div>
  );
}
