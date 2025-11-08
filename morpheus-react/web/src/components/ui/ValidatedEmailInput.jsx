// src/components/ui/ValidatedEmailInput.jsx
import React, { useState } from "react";
import TextField from "@mui/material/TextField";

export default function ValidatedEmailInput({ value, onChange, ...props }) {
  const [error, setError] = useState(false);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange && onChange(e); // 반드시 이벤트 객체 그대로 전달
    setError(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val));
  };

  return (
    <TextField
      label="Email"
      value={value}
      onChange={handleChange}
      error={error}
      helperText={error ? "Invalid email format" : ""}
      fullWidth
      margin="normal"
      variant="outlined"
      {...props}
    />
  );
}
