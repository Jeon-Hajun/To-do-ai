// src/components/ui/LogoutButton.jsx
import React from "react";
import Button from "@mui/material/Button";
import { logout as localLogout } from "../../utils/auth";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // 서버 로그아웃 요청 (선택)
      await axios.post(
        "http://localhost:3000/api/user/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch (err) {
      console.error("서버 로그아웃 실패", err);
      // 서버 실패여도 local 로그아웃 후 이동
    } finally {
      // 로컬에서 사용자 정보 삭제
      localLogout();
      // 무조건 로그인 페이지로 이동
      navigate("/login", { replace: true });
    }
  };

  return (
    <Button
      variant="contained"
      color="error"
      fullWidth
      onClick={handleLogout}
      sx={{
        mt: 2,
        py: 1.5,
        fontWeight: "bold",
        borderRadius: "50px",
        fontSize: "1rem",
        textTransform: "none",
        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
        "&:hover": {
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          transform: "translateY(-2px)",
        },
      }}
    >
      로그아웃
    </Button>
  );
}
