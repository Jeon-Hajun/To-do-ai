// src/pages/SignupPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import ContainerBox from "../components/ui/ContainerBox";
import Input from "../components/ui/Input";
import ValidatedEmailInput from "../components/ui/ValidatedEmailInput";
import SignupButton from "../components/ui/SignupButton";
import Button from "../components/ui/Button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  return (
    <ContainerBox sx={{ justifyContent: "center", alignItems: "center" }}>
      <Card sx={{ width: 450, maxWidth: "100%", p: 4, position: "relative" }}>
        
        {/* ✅ 오른쪽 상단 뒤로가기 버튼 */}
        <Button
          type="back"
          size="small"
          style={{
            position: "absolute",
            right: 12,
            top: 12,
          }}
        >
          ← 뒤로
        </Button>

        <h2 style={{ textAlign: "center", marginBottom: 24 }}>회원가입</h2>

        <form>
          <ValidatedEmailInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Input
            label="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
          />

          <SignupButton
            email={email}
            nickname={nickname}
            password={password}
            onSignupSuccess={() => navigate("/login")}
          />
        </form>
      </Card>
    </ContainerBox>
  );
}
