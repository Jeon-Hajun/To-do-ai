// src/components/UserProfile/EditProfileModal.jsx
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Snackbar,
  Alert,
  Avatar,
  IconButton,
} from "@mui/material";
import { updateUser, setAuth } from "../utils/auth";
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

export default function EditProfileModal({ user, open, onClose }) {
  const [email, setEmail] = useState(user.email);
  const [nickname, setNickname] = useState(user.nickname);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileImage, setProfileImage] = useState(user.profileImage);
  const [selectedFile, setSelectedFile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setProfileImage(URL.createObjectURL(e.target.files[0])); // 미리보기
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !nickname) {
      setSnackbar({ open: true, severity: "error", message: "이메일과 닉네임은 필수입니다." });
      return;
    }

    try {
      // 1. 회원 정보 수정
      const res = await updateUser({ email, nickname, password, newPassword });
      if (res.success) {
        // 2. 프로필 이미지 업로드
        if (selectedFile) {
          const formData = new FormData();
          formData.append("profileImage", selectedFile);

          const token = localStorage.getItem("token");
          await fetch("http://localhost:5000/api/user/me/profile-image", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });
        }

        setSnackbar({ open: true, severity: "success", message: res.message || "회원 정보가 수정되었습니다." });
        
        setPassword("");
        setNewPassword("");
        setSelectedFile(null);

        // 최신 정보 저장
        if (res.data?.user) {
          setAuth({ ...res.data.user, profileImage });
        }

        setTimeout(() => onClose(), 1500);
      }
    } catch (err) {
      setSnackbar({ open: true, severity: "error", message: err.error?.message || "회원 정보 수정 실패" });
      setPassword("");
      setNewPassword("");
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>회원 정보 수정</DialogTitle>
        <DialogContent>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <Avatar src={profileImage} sx={{ width: 64, height: 64 }} />
            <label htmlFor="profile-file">
              <input
                accept="image/*"
                id="profile-file"
                type="file"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <IconButton color="primary" component="span">
                <PhotoCameraIcon />
              </IconButton>
            </label>
          </div>

          <TextField
            margin="dense"
            label="이메일"
            type="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="닉네임"
            type="text"
            fullWidth
            variant="outlined"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="현재 비밀번호"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 변경 시 입력"
          />
          <TextField
            margin="dense"
            label="새 비밀번호"
            type="password"
            fullWidth
            variant="outlined"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="변경할 비밀번호"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>뒤로가기</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            수정
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
