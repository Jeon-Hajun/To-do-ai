// src/components/UserProfile/EditProfileModal.jsx
import React, { useState, useEffect } from "react";
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
import { getProfileImageSrc } from "../utils/profileImage";
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

export default function EditProfileModal({ user, open, onClose, onSuccess }) {
  const [nickname, setNickname] = useState(user.nickname);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileImage, setProfileImage] = useState(user.profileImage);
  const [selectedFile, setSelectedFile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, severity: "success", message: "" });

  // 모달이 열릴 때마다 user 정보를 최신화
  useEffect(() => {
    if (open && user) {
      setNickname(user.nickname);
      setPassword("");
      setNewPassword("");
      setSelectedFile(null);
      // 모달이 열릴 때는 항상 최신 프로필 이미지로 초기화
      setProfileImage(user.profileImage);
    }
  }, [open, user?.nickname, user?.profileImage]);
  
  // 모달이 열려있는 동안 user.profileImage가 변경될 때 업데이트 (미리보기 중이 아닐 때)
  useEffect(() => {
    if (open && user?.profileImage && !selectedFile) {
      // blob URL이 아니고 값이 다를 때만 업데이트
      const isBlob = profileImage?.startsWith('blob:');
      if (!isBlob && user.profileImage !== profileImage) {
        setProfileImage(user.profileImage);
      }
    }
  }, [user?.profileImage, open, selectedFile, profileImage]);

  // 컴포넌트 언마운트 시 blob URL 정리
  useEffect(() => {
    return () => {
      if (profileImage?.startsWith('blob:')) {
        URL.revokeObjectURL(profileImage);
      }
    };
  }, [profileImage]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      // 이전 blob URL 정리
      if (profileImage?.startsWith('blob:')) {
        URL.revokeObjectURL(profileImage);
      }
      setSelectedFile(e.target.files[0]);
      setProfileImage(URL.createObjectURL(e.target.files[0])); // 미리보기
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nickname) {
      setSnackbar({ open: true, severity: "error", message: "닉네임은 필수입니다." });
      return;
    }

    try {
      // 1. 회원 정보 수정 (이메일은 현재 이메일 그대로 전송)
      const res = await updateUser({ email: user.email, nickname, password, newPassword });
      if (res.success) {
        let updatedProfileImage = user.profileImage;
        
        // 2. 프로필 이미지 업로드
        if (selectedFile) {
          const formData = new FormData();
          formData.append("profileImage", selectedFile);

          const token = localStorage.getItem("token");
          const imageRes = await fetch("http://localhost:5000/api/user/me/profile-image", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });
          
          if (imageRes.ok) {
            const imageData = await imageRes.json();
            if (imageData.success && imageData.data?.profileImage) {
              updatedProfileImage = imageData.data.profileImage;
            }
          }
          
          // blob URL 정리
          if (profileImage.startsWith('blob:')) {
            URL.revokeObjectURL(profileImage);
          }
        }

        setSnackbar({ open: true, severity: "success", message: res.message || "회원 정보가 수정되었습니다." });
        
        setPassword("");
        setNewPassword("");
        setSelectedFile(null);

        // 최신 정보 저장 및 콜백 호출
        // res.data.user에 id가 없을 수 있으므로 원래 user.id를 포함시킴
        const updatedUser = {
          ...res.data.user,
          id: res.data.user?.id || user.id, // res.data.user.id가 있으면 사용, 없으면 원래 user.id 사용
          profileImage: updatedProfileImage,
        };
        setAuth(updatedUser);
        
        // 모달 내부의 프로필 이미지도 업데이트 (blob URL이 아닌 경우)
        if (!updatedProfileImage.startsWith('blob:')) {
          setProfileImage(updatedProfileImage);
        }
        
        if (onSuccess) {
          onSuccess(updatedUser);
        }

        // 모달 바로 닫기
        onClose();
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
            <Avatar 
              src={getProfileImageSrc(profileImage, true)} 
              sx={{ width: 64, height: 64 }} 
            />
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
            value={user.email}
            disabled
            helperText="이메일은 변경할 수 없습니다"
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
