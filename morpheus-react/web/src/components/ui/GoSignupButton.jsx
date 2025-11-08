// src/components/ui/GoSignupButton.jsx
import React from "react";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";

export default function GoSignupButton({ sx, ...props }) {
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
        fontWeight: "bold",
        borderRadius: "50px",
        background: "linear-gradient(90deg, #10b981, #3b82f6)",
        color: "#fff",
        textTransform: "none",
        fontSize: "1.1rem",
        "&:hover": {
          background: "linear-gradient(90deg, #3b82f6, #10b981)",
        },
        ...sx,
      }}
      {...props}
    >
      회원가입
    </Button>
  );
}
