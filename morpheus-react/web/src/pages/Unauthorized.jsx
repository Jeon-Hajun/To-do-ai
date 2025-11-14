// web/src/pages/Unauthorized.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>접근 권한 없음</h1>
      <p>이 페이지에 접근할 수 있는 권한이 없습니다.</p>
      <Link to="/home" style={{ color: "blue", textDecoration: "underline" }}>
        홈으로 돌아가기
      </Link>
    </div>
  );
}
