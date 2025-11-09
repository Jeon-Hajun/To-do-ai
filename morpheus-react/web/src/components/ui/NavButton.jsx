import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "@mui/material/Button";
import { useTheme } from "@mui/material/styles";

export default function NavButton({ name, path }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = location.pathname === path;

  return (
    <Button
      onClick={() => navigate(path)}
      fullWidth
      sx={{
        flex: 1,
        py: 1.5,
        borderRadius: theme.shape.borderRadius,
        textTransform: "none",
        fontWeight: 600,
        transition: "all 0.2s ease",
        bgcolor: isActive ? theme.palette.primary.main : theme.palette.background.paper,
        color: isActive ? theme.palette.getContrastText(theme.palette.primary.main) : theme.palette.text.primary,
        "&:hover": {
          bgcolor: isActive ? theme.palette.primary.dark : theme.palette.grey[100],
        },
      }}
    >
      {name}
    </Button>
  );
}
