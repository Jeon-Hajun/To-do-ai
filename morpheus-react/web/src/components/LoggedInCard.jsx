// src/components/LoggedInCard.jsx
import React from "react";
import Card from "./ui/Card";
import LogoutButton from "./ui/LogoutButton";
import { useAuthContext } from "../context/AuthContext";

export default function LoggedInCard() {
  const { user } = useAuthContext();

  // Vite 프록시를 통해 프로필 이미지 불러오기 (상대 경로)
  const imgSrc = `/profile/${user?.profileImage || 'basic.png'}`;

  return (
    <Card
      title="🎉 로그인 완료"
      actions={<LogoutButton />}
      sx={{ maxWidth: 450, mx: "auto", textAlign: "center" }}
    >
      <img
        src={imgSrc}
        alt="프로필"
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          objectFit: "cover",
          marginBottom: "16px",
        }}
        onError={(e) => {
          // 무한 루프 방지
          if (e.target.src.includes('basic.png')) {
            e.target.onerror = null;
            return;
          }
          e.target.onerror = null;
          e.target.src = "/profile/basic.png";
        }}
      />

      <div style={{ marginBottom: "16px", fontSize: "18px" }}>
        환영합니다, <b>{user.nickname ?? user.email}</b> 님! 👋
      </div>

      <div style={{ fontSize: "14px", color: "#555" }}>
        이메일: {user.email}
      </div>
    </Card>
  );
}
