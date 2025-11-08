// src/components/ui/SignupButton.jsx
import React, { useState } from "react";
import Button from "@mui/material/Button";

const API_URL = "http://localhost:5000/api/user";

export default function SignupButton({ email, nickname, password, onSignupSuccess, sx, ...props }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    if (!email || !nickname || !password) {
      setError("모든 항목을 입력해주세요.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nickname, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "회원가입 실패");
        return;
      }

      if (onSignupSuccess) onSignupSuccess(data); // 내부에서만 호출
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
        onClick={handleSignup}
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
        {...props} // onSignupSuccess 제거
      >
        {loading ? "회원가입 중..." : "회원가입"}
      </Button>

      {error && <div style={{ color: "red", marginTop: 8, fontSize: "0.9rem" }}>{error}</div>}
    </>
  );
}
