import React, { useState, useEffect } from 'react';
import { Box, Paper, Avatar, Typography, Divider, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert, Stack, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { deleteUser } from '../utils/auth';
import { getProfileImageSrc } from '../utils/profileImage';
import EditProfileModal from '../components/EditProfileModal';
import { Header, NavBar, ContainerBox } from '../components/layout';
import { themes } from '../theme';

export default function SettingsPage() {
    const { user, loading, setUser, logout } = useAuthContext();
    const navigate = useNavigate();
    const [openEditModal, setOpenEditModal] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openThemeDialog, setOpenThemeDialog] = useState(false);
    const [currentTheme, setCurrentTheme] = useState(() => {
        return localStorage.getItem("theme") || "light";
    });
    const [snackbar, setSnackbar] = useState({ open: false, severity: 'success', message: '' });

    useEffect(() => {
        // 테마 변경 감지
        const handleStorageChange = (e) => {
            if (e.key === "theme") {
                setCurrentTheme(e.newValue || "light");
            }
        };
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    const imgSrc = getProfileImageSrc(user?.profileImage, true);

    const handleUpdate = (updatedUser) => {
        setUser(updatedUser);
        setTimeout(() => window.dispatchEvent(new Event('profileUpdated')), 100);
    };

    const handleDeleteAccount = async () => {
        try {
            const res = await deleteUser();
            if (res.success) {
                setSnackbar({ open: true, severity: 'success', message: res.message || '회원 탈퇴가 완료되었습니다.' });
                logout();
                setTimeout(() => navigate('/login', { replace: true }), 1500);
            }
        } catch (err) {
            setSnackbar({ open: true, severity: 'error', message: err.error?.message || '회원 탈퇴 중 오류가 발생했습니다.' });
        } finally {
            setOpenDeleteDialog(false);
        }
    };

    if (loading) {
        return (
            <ContainerBox sx={{ pb: 8 }}>
                <Header title="설정" />
                <Box sx={{ p: 3 }}>로딩 중...</Box>
                <NavBar />
            </ContainerBox>
        );
    }

    return (
        <ContainerBox sx={{ pb: 8 }}>
            <Header title="설정" />
            
            <Box sx={{ flex: 1, pt: 3, px: 2, display: 'flex', justifyContent: 'center' }}>
                <Paper sx={{ maxWidth: 360, width: '100%', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Avatar
                        alt={user?.nickname}
                        src={imgSrc}
                        sx={{ width: 70, height: 70, mb: 2 }}
                    />
                    <Typography variant="body1" sx={{ mb: 0.5 }}>
                        닉네임: {user?.nickname}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        이메일: {user?.email}
                    </Typography>

                    <Stack spacing={1} width="100%">
                        <Button fullWidth variant="contained" onClick={() => setOpenEditModal(true)}>
                            계정 정보 수정
                        </Button>
                        <Divider sx={{ my: 1 }} />
                        <Button fullWidth variant="outlined" onClick={() => setOpenThemeDialog(true)}>
                            디스플레이 설정
                        </Button>
                        <Button fullWidth variant="outlined">
                            문의하기
                        </Button>
                        <Divider sx={{ my: 1 }} />
                        <Stack direction="row" justifyContent="space-between">
                            <Button variant="text" onClick={logout}>
                                로그아웃
                            </Button>
                            <Button variant="text" color="error" onClick={() => setOpenDeleteDialog(true)}>
                                탈퇴하기
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            </Box>

            <EditProfileModal 
                user={user} 
                open={openEditModal} 
                onClose={() => setOpenEditModal(false)}
                onSuccess={handleUpdate}
            />

            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>회원 탈퇴</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        정말 탈퇴하시겠습니까? 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)}>취소</Button>
                    <Button onClick={handleDeleteAccount} color="error" variant="contained">탈퇴하기</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openThemeDialog} onClose={() => setOpenThemeDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>테마 설정</DialogTitle>
                <DialogContent>
                    <FormControl component="fieldset" fullWidth>
                        <FormLabel component="legend" sx={{ mb: 2 }}>테마 선택</FormLabel>
                        <RadioGroup
                            value={currentTheme}
                            onChange={(e) => {
                                const newTheme = e.target.value;
                                setCurrentTheme(newTheme);
                                localStorage.setItem("theme", newTheme);
                                // 테마 변경 함수 호출 (현재 탭에서 즉시 반영)
                                if (window.changeTheme) {
                                    window.changeTheme(newTheme);
                                }
                            }}
                        >
                            {Object.entries(themes).map(([key, themeConfig]) => (
                                <FormControlLabel
                                    key={key}
                                    value={key}
                                    control={<Radio />}
                                    label={themeConfig.name}
                                />
                            ))}
                        </RadioGroup>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenThemeDialog(false)}>닫기</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <NavBar />
        </ContainerBox>
    );
}
