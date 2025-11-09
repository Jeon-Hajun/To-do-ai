import React from "react";
import Button from "@mui/material/Button";
import { useAuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

export default function LogoutButton() {
  const theme = useTheme();
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // 상태와 localStorage 삭제
    navigate("/login", { replace: true });
  };

  return (
    <Button
      variant="contained"
      fullWidth
      onClick={handleLogout}
      sx={{
        mt: 2,
        py: 1.5,
        fontWeight: 600,
        borderRadius: theme.shape.borderRadius,
        fontSize: "1rem",
        textTransform: "none",
        backgroundColor: theme.palette.error.main,
        color: theme.palette.getContrastText(theme.palette.error.main),
        "&:hover": {
          backgroundColor: theme.palette.error.dark,
        },
      }}
    >
      로그아웃
    </Button>
  );
}
