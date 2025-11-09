import React from "react";
import { useNavigate } from "react-router-dom";
import MuiButton from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useTheme } from "@mui/material/styles";

export default function Button({
  children,
  type = "primary", // primary, secondary, danger, back, select
  htmlType = "button",
  toggleValue = null,
  toggleExclusive = true,
  toggleSize = "medium",
  control = {},
  sx = {},
  ...props
}) {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleClick = (e) => {
    if (type === "back") navigate(-1);
    if (props.onClick) props.onClick(e);
  };

  // 각 타입별 스타일 정의
  const typeStyles = {
    primary: {
      borderRadius: 2,
      fontWeight: 600,
      textTransform: "none",
      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
      color: theme.palette.getContrastText(theme.palette.primary.main),
      boxShadow: "0 4px 14px 0 rgba(0,0,0,0.25)",
      "&:hover": {
        background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
        boxShadow: "0 6px 20px 0 rgba(0,0,0,0.3)",
        transform: "translateY(-2px)",
      },
    },
    secondary: {
      borderRadius: 1,
      fontWeight: 500,
      textTransform: "none",
      backgroundColor: theme.palette.grey[200],
      color: theme.palette.text.primary,
      "&:hover": {
        backgroundColor: theme.palette.grey[300],
      },
    },
    danger: {
      borderRadius: 3,
      fontWeight: 700,
      textTransform: "none",
      backgroundColor: theme.palette.error.main,
      color: theme.palette.getContrastText(theme.palette.error.main),
      "&:hover": {
        backgroundColor: theme.palette.error.dark,
      },
    },
    back: {
      borderRadius: theme.shape.borderRadius,
      fontWeight: 600,
      textTransform: "none",
      border: `1px solid ${theme.palette.grey[400]}`,
      backgroundColor: "transparent",
      color: theme.palette.text.primary,
      "&:hover": {
        backgroundColor: theme.palette.grey[100],
      },
    },
  };

  // Toggle 버튼 그룹
  if (type === "select") {
    return (
      <ToggleButtonGroup
        color="primary"
        value={toggleValue}
        exclusive={toggleExclusive}
        size={toggleSize}
        {...control}
      >
        {React.Children.map(children, (child, idx) => (
          <ToggleButton key={idx} value={child.props.value}>
            {child.props.children}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    );
  }

  // ✅ 기본 MUI 버튼
  return (
    <MuiButton
      variant="contained"
      type={htmlType}
      onClick={handleClick}
      sx={{ ...typeStyles[type], ...sx }}
      {...props}
    >
      {children}
    </MuiButton>
  );
}
