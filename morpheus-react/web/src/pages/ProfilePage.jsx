import React from "react";
import { Box, Typography } from "@mui/material";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import ContainerBox from "../components/ui/ContainerBox";
import LogoutButton from "../components/ui/LogoutButton";
import useAuth from "../hooks/useAuth";

export default function ProfilePage() {
  useAuth(); // 로그인 체크

  return (
    <ContainerBox sx={{ minHeight: '100vh', bgcolor: 'grey.100', pb: 8 }}>
      <Header title="Profile" />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          프로필
        </Typography>
        <Typography variant="body2" color="text.secondary">
          사용자 정보와 계정 설정을 여기에 표시하세요.
        </Typography>

        <LogoutButton />
      </Box>
      <NavBar />
    </ContainerBox>
  );
}
