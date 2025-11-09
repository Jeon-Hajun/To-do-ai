import React, { useState } from "react";
import Card from "./ui/Card";
import LogoutButton from "./ui/LogoutButton";
import { useAuthContext } from "../context/AuthContext";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import EditProfileModal from "./EditProfileModal";

export default function LoggedInCard() {
  const { user, setUser } = useAuthContext();
  const [openEdit, setOpenEdit] = useState(false);

  const imgSrc = `/profile/${user?.profileImage || "basic.png"}`;

  const handleUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <>
      <Card
        title="🎉 로그인 완료"
        actions={<LogoutButton />}
        sx={{ maxWidth: 450, mx: "auto", textAlign: "center", p: 3 }}
      >
        <Box
          component="img"
          src={imgSrc}
          alt="프로필"
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            objectFit: "cover",
            mb: 2,
          }}
        />

        <Typography variant="body1" sx={{ mb: 1.5 }}>
          환영합니다, <b>{user.nickname ?? user.email}</b> 님! 👋
        </Typography>

        <Typography variant="body2" color="text.secondary">
          이메일: {user.email}
        </Typography>

        <Button
          variant="outlined"
          size="small"
          sx={{ mt: 2 }}
          onClick={() => setOpenEdit(true)}
        >
          회원정보 수정
        </Button>
      </Card>

      <EditProfileModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        user={user}
        onUpdate={handleUpdate}
      />
    </>
  );
}
