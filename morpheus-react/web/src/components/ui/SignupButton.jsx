import React, { useState } from "react";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

const API_URL = "http://localhost:5000/api/user";

export default function SignupButton({ email, nickname, password, onSignupSuccess, sx, ...props }) {
  const theme = useTheme();
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

      if (onSignupSuccess) onSignupSuccess(data);
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
          fontWeight: 600,
          borderRadius: theme.shape.borderRadius,
          background: `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.primary.main})`,
          color: theme.palette.getContrastText(theme.palette.primary.main),
          textTransform: "none",
          fontSize: "1.1rem",
          boxShadow: theme.shadows[4],
          transition: "all 0.3s ease",
          "&:hover": {
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.success.main})`,
            boxShadow: theme.shadows[6],
            transform: "translateY(-2px)",
          },
          ...sx,
        }}
        {...props}
      >
        {loading ? "회원가입 중..." : "회원가입"}
      </Button>

      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
    </>
  );
}
