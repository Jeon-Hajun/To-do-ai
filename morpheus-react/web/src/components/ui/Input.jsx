// src/components/ui/Input.jsx
import React from "react";
import TextField from "@mui/material/TextField";

export default function Input({
  label,
  type = "text",
  value,
  onChange,
  name,
  variant = "outlined",
  ...props
}) {
  return (
    <TextField
      id={name || label}
      name={name}         // ⚡ name 필수
      label={label}
      type={type}
      value={value}       // ⚡ value 필수
      onChange={onChange} // ⚡ event => value 업데이트
      variant={variant}
      fullWidth
      {...props}
    />
  );
}
