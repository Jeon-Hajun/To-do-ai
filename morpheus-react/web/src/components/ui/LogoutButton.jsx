import React from "react";
import Button from "@mui/material/Button";
import { useAuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // 상태와 localStorage 삭제
    navigate("/login", { replace: true });
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
      }}
    >
      로그아웃
    </Button>
  );
}
