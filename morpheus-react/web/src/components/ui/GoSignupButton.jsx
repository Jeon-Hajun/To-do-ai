import React from "react";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

export default function GoSignupButton({ sx, ...props }) {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/signup"); // 회원가입 페이지로 이동
  };

  return (
    <Button
      fullWidth
      onClick={handleClick}
      sx={{
        mt: 2,
        py: 1.75,
        fontWeight: 600,
        borderRadius: theme.shape.borderRadius, // theme radius 적용
        background: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
        color: "#fff",
        textTransform: "none",
        fontSize: "1.1rem",
        "&:hover": {
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
        },
        ...sx,
      }}
      {...props}
    >
      회원가입
    </Button>
  );
}
