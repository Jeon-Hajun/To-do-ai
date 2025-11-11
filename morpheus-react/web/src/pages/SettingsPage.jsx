import React, { useState } from 'react';
import { Box, Paper, Avatar, Typography, Divider, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { setAuth, deleteUser } from '../utils/auth';
import { getProfileImageSrc } from '../utils/profileImage';
import Header from '../components/ui/Header';
import NavBar from '../components/ui/NavBar';
import EditProfileModal from '../components/EditProfileModal';

export default function SettingsPage() {
    const { user, loading, setUser, logout } = useAuthContext();
    const navigate = useNavigate();
    const [openEditModal, setOpenEditModal] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, severity: 'success', message: '' });

    const imgSrc = getProfileImageSrc(user?.profileImage, true);

    const handleUpdate = (updatedUser) => {
        const newUser = { ...updatedUser };
        setUser(newUser);
        setAuth(newUser);
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
        return <Box sx={{ p: 3 }}>로딩 중...</Box>;
    }

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
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
                        <Button fullWidth variant="outlined">
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
        </Box>
    );
}
