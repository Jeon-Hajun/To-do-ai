import React, { useState } from "react";
import Button from "@mui/material/Button";
import { setAuth } from "../../utils/auth";
import { useAuthContext } from "../../context/AuthContext"; // ✅ 추가

const API_URL = "http://localhost:3000/api/user";

export default function LoginButton({ email, password, onLoginSuccess, sx, ...props }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuthContext(); // ✅ AuthContext login 사용

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "로그인 실패");
        return;
      }

      setAuth(data);
      login(data); // ✅ 로그인 상태 전역 업데이트

      if (onLoginSuccess) onLoginSuccess(data);

    } catch (err) {
      console.error(err);
      setError("서버 연결 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="submit"
        fullWidth
        onClick={handleLogin}
        disabled={loading}
        sx={{
          mt: 2,
          py: 1.75,
          fontWeight: "bold",
          borderRadius: "50px",
          background: "linear-gradient(90deg, #10b981, #3b82f6)",
          color: "#fff",
          textTransform: "none",
          fontSize: "1.1rem",
          boxShadow: "0 4px 14px 0 rgba(0,0,0,0.25)",
          transition: "all 0.3s ease",
          "&:hover": {
            background: "linear-gradient(90deg, #3b82f6, #10b981)",
            boxShadow: "0 6px 20px 0 rgba(0,0,0,0.3)",
            transform: "translateY(-2px)",
          },
          ...sx,
        }}
        {...props}
      >
        {loading ? "로그인 중..." : "로그인"}
      </Button>

      {error && <div style={{ color: "red", marginTop: 8, fontSize: "0.9rem" }}>{error}</div>}
    </>
  );
}
