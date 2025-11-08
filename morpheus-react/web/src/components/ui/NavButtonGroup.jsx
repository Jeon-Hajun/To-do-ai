// src/components/ui/NavButtonGroup.jsx
import React from "react";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme, useMediaQuery } from "@mui/material";

export default function NavButtonGroup({ buttons = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  // 화면 크기 감지 (sm 이하일 때 아이콘만 표시)
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <ToggleButtonGroup
      color="primary"
      value={location.pathname}
      exclusive
      onChange={(_, newValue) => newValue && navigate(newValue)}
      fullWidth
      sx={{
        "& .MuiToggleButton-root": {
          border: "none",
          py: isSmallScreen ? 1.2 : 1.5,
          px: isSmallScreen ? 0.5 : 2,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isSmallScreen ? "1.2rem" : "1rem",
        },
      }}
    >
      {buttons.map((btn, idx) => {
        const Icon = btn.icon;
        return (
          <ToggleButton key={idx} value={btn.path}>
            {Icon && <Icon sx={{ mr: isSmallScreen ? 0 : 1 }} />}
            {!isSmallScreen && btn.label}
          </ToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
}
