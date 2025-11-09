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
} from "@mui/material";
import { updateUser, setAuth } from "../utils/auth";

export default function EditProfileModal({ user, open, onClose }) {
  const [email, setEmail] = useState(user.email);
  const [nickname, setNickname] = useState(user.nickname);
  const [password, setPassword] = useState(""); // 현재 비밀번호
  const [newPassword, setNewPassword] = useState(""); // 새 비밀번호
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !nickname) {
      setSnackbar({ open: true, severity: "error", message: "이메일과 닉네임은 필수입니다." });
      return;
    }

    try {
      const res = await updateUser({ email, nickname, password, newPassword });
      if (res.success) {
        setSnackbar({ open: true, severity: "success", message: res.message || "회원 정보가 수정되었습니다." });
        
        // 비밀번호 입력창 초기화
        setPassword("");
        setNewPassword("");

        // 모달 닫기
        setTimeout(() => onClose(), 1500);

        // 로컬스토리지 최신화
        if (res.data?.user) {
          setAuth(res.data.user);
        }
      }
    } catch (err) {
      setSnackbar({ open: true, severity: "error", message: err.error?.message || "회원 정보 수정 실패" });

      // 실패 시에도 비밀번호 입력창 초기화
      setPassword("");
      setNewPassword("");
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>회원 정보 수정</DialogTitle>
        <DialogContent>
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
          <Button onClick={onClose}>취소</Button>
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
