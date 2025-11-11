import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Card, Button, Typography, Stack } from "@mui/material";
import Input from "../components/ui/Input";
import ValidatedEmailInput from "../components/ui/ValidatedEmailInput";
import SignupButton from "../components/ui/SignupButton";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Card sx={{ width: 450, maxWidth: "100%", p: 4, position: "relative" }}>
        
        {/* 뒤로가기 버튼 */}
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate(-1)}
          sx={{ position: "absolute", top: 12, right: 12 }}
        >
          ← 뒤로
        </Button>

        <Typography variant="h5" align="center" sx={{ mb: 3 }}>
          회원가입
        </Typography>

        <Stack spacing={2}>
          <ValidatedEmailInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <SignupButton
            email={email}
            nickname={nickname}
            password={password}
            onSignupSuccess={() => navigate("/login")}
          />
        </Stack>
      </Card>
    </Box>
  );
}
