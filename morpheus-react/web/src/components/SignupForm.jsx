import React, { useState } from "react";
import Box from "@mui/material/Box";
import Input from "../ui/Input";
import ValidatedEmailInput from "../ui/ValidatedEmailInput";
import SignupButton from "../ui/SignupButton";
import Typography from "@mui/material/Typography";

export default function SignupForm({ onSignupSuccess }) {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMismatch = password && confirmPassword && password !== confirmPassword;

  return (
    <Box
      component="form"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%",
        maxWidth: 320,
        mx: "auto",
      }}
    >
      <ValidatedEmailInput value={email} onChange={(e) => setEmail(e.target.value)} />

      <Input
        label="닉네임"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />

      <Input
        label="비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Input
        label="비밀번호 확인"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      {passwordsMismatch && (
        <Typography color="error" variant="body2">
          비밀번호가 일치하지 않습니다.
        </Typography>
      )}

      <SignupButton
        email={email}
        password={password}
        nickname={nickname}
        onSignupSuccess={onSignupSuccess}
      />
    </Box>
  );
}
