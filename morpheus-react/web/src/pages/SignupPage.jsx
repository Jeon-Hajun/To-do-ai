// src/pages/SignupPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import ContainerBox from "../components/ui/ContainerBox";
import Input from "../components/ui/Input";
import ValidatedEmailInput from "../components/ui/ValidatedEmailInput";
import SignupButton from "../components/ui/SignupButton";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  return (
    <ContainerBox
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        p: 2,
      }}
    >
      <Card
        title="회원가입"
        sx={{ width: 450, maxWidth: "100%", textAlign: "center", p: 4 }}
      >
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
