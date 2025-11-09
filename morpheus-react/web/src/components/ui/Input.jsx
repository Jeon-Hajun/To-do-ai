import React from "react";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";

export default function Input({
  label,
  type = "text",
  value,
  onChange,
  name,
  variant = "outlined",
  sx = {},
  ...props
}) {
  const theme = useTheme();

  return (
    <TextField
      id={name || label}
      name={name}
      label={label}
      type={type}
      value={value}
      onChange={onChange}
      variant={variant}
      fullWidth
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: theme.shape.borderRadius, // theme radius
        },
        "& .MuiInputLabel-root": {
          color: theme.palette.text.secondary, // label color
        },
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.grey[400], // 기본 테두리 색상
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.primary.main,
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.primary.main,
        },
        ...sx,
      }}
      {...props}
    />
  );
}
