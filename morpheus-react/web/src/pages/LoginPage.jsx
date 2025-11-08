import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Card from "../components/ui/Card";
import ContainerBox from "../components/ui/ContainerBox";
import ValidatedEmailInput from "../components/ui/ValidatedEmailInput";
import Input from "../components/ui/Input";
import GoSignupButton from "../components/ui/GoSignupButton";
import { useAuthContext } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuthContext();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/user/login", {
        email,
        password,
      });

      const token = res.data.data.token; // ✅ token 가져오기
      if (!token) throw new Error("Token not received");

      await login(token); // 토큰 저장 + 서버에서 사용자 정보 받아오기
      navigate("/main"); // 로그인 후 메인 페이지 이동
    } catch (err) {
      console.error(err);
      setError("로그인 실패. 이메일 또는 비밀번호를 확인하세요.");
    }
  };

  return (
    <ContainerBox
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        p: 2,
        backgroundColor: "#f5f5f5",
      }}
    >
      <Card
        title="로그인"
        sx={{
          width: 450,
          maxWidth: "100%",
          textAlign: "center",
          p: 4,
        }}
      >
        <form onSubmit={handleLogin}>
          <ValidatedEmailInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Input
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              marginBottom: "12px",
            }}
          >
            로그인
          </button>
          <GoSignupButton />
        </form>
      </Card>
    </ContainerBox>
  );
}
