import React from "react";
import Card from "./ui/Card";
import LogoutButton from "./ui/LogoutButton";

export default function LoggedInCard({ email, children }) {
  return (
    <Card
      title="🎉 로그인 완료"
      actions={<LogoutButton />}
      sx={{ maxWidth: 450, mx: "auto", textAlign: "center" }}
    >
      <div style={{ marginBottom: "16px" }}>환영합니다, {email}님!</div>
      {children /* 추가 계정/정보 UI */}
    </Card>
  );
}
