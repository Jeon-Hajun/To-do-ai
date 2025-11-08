// src/components/ui/Button.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import MuiButton from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

export default function Button({
  children,
  className = "",
  type = "default",        // default | select | back
  htmlType = "button",
  toggleValue = null,      // 선택 버튼 값
  toggleExclusive = true,  // 하나만 선택
  toggleSize = "medium",   // small | medium | large
  control = {},            // ToggleButtonGroup props (value, onChange)
  ...props
}) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (type === "back") navigate(-1);
    if (props.onClick) props.onClick(e);
  };

  // 기본 버튼
  if (type === "default") {
    return (
      <MuiButton
        variant="contained"
        color="primary"
        type={htmlType}
        className={className}
        onClick={handleClick}
        {...props}
      >
        {children}
      </MuiButton>
    );
  }

  // 선택 버튼 (ToggleButtonGroup)
  if (type === "select") {
    return (
      <ToggleButtonGroup
        color="primary"
        value={toggleValue}
        exclusive={toggleExclusive} // 하나만 선택
        size={toggleSize}
        className={className}
        {...control} // onChange 등
      >
        {React.Children.map(children, (child, idx) => (
          <ToggleButton key={idx} value={child.props.value}>
            {child.props.children}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    );
  }

  // 뒤로가기 버튼
  const baseClasses = "py-2 px-4 rounded-md transition-colors flex items-center justify-center ";
  return (
    <button
      className={`${baseClasses} bg-gray-400 text-white hover:bg-gray-500 ${className}`}
      {...props}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
