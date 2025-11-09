import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";

export default function ValidatedEmailInput({ value, onChange, sx = {}, ...props }) {
  const theme = useTheme();
  const [error, setError] = useState(false);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange && onChange(e); // 이벤트 그대로 전달
    setError(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val));
  };

  return (
    <TextField
      label="Email"
      value={value}
      onChange={handleChange}
      error={error}
      helperText={error ? "올바른 이메일 형식이 아닙니다." : ""}
      fullWidth
      variant="outlined"
      sx={{
        mb: 3,
        "& .MuiOutlinedInput-root": {
          borderRadius: theme.shape.borderRadius,
        },
        ...sx,
      }}
      {...props}
    />
  );
}
