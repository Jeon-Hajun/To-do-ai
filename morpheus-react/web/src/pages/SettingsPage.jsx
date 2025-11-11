import React, { useState } from 'react';
import { Box, Paper, Avatar, Typography, Divider, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { setAuth, deleteUser } from '../utils/auth';
import { getProfileImageSrc } from '../utils/profileImage';
import Header from '../components/ui/Header';
import NavBar from '../components/ui/NavBar';
import ContainerBox from '../components/ui/ContainerBox';
import PageContainer from '../components/ui/PageContainer';
import EditProfileModal from '../components/EditProfileModal';

export default function SettingsPage() {
    const { user, loading, setUser, logout } = useAuthContext();
    const navigate = useNavigate();
    const [openEditModal, setOpenEditModal] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, severity: 'success', message: '' });

    // 프로필 이미지 경로 생성 (캐시 무효화 포함)
    const imgSrc = getProfileImageSrc(user?.profileImage, true);

    const handleUpdate = (updatedUser) => {
        // 세션 메모리 및 UI 동기화 - 새로운 객체로 확실히 업데이트
        const newUser = { ...updatedUser };
        setUser(newUser);
        // localStorage도 업데이트
        setAuth(newUser);
        // 프로필 수정 이벤트 발생 (다른 페이지에서 감지할 수 있도록)
        // 약간의 지연을 두어 setUser가 완료된 후 이벤트 발생
        setTimeout(() => {
          window.dispatchEvent(new Event('profileUpdated'));
        }, 100);
    };

    const handleModalClose = () => {
        setOpenEditModal(false);
        // 모달이 닫힐 때 user 객체가 변경되었을 수 있으므로
        // user 객체의 변경이 자동으로 감지되어 프로젝트가 다시 불러와집니다
    };

    const handleDeleteAccount = async () => {
        try {
            const res = await deleteUser();
            if (res.success) {
                setSnackbar({ open: true, severity: 'success', message: res.message || '회원 탈퇴가 완료되었습니다.' });
                // 로그아웃 처리 (deleteUser에서 이미 처리되지만 확실히)
                logout();
                // 로그인 페이지로 이동
                setTimeout(() => {
                    navigate('/login', { replace: true });
                }, 1500);
            }
        } catch (err) {
            setSnackbar({ 
                open: true, 
                severity: 'error', 
                message: err.error?.message || '회원 탈퇴 중 오류가 발생했습니다.' 
            });
        } finally {
            setOpenDeleteDialog(false);
        }
    };

    if (loading) {
        return (
            <ContainerBox>
                <PageContainer>로딩 중...</PageContainer>
            </ContainerBox>
        );
    }

    return (
        <ContainerBox
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(#101529,#404d6c)',
                p: 0,
            }}
        >
            <Header title="Settings" />
            <Box sx={{ flex: 1, pt: 3, px: 2, display: 'flex', flexDirection: 'column' }}>
                <Paper
                    elevation={8}
                    sx={{
                        maxWidth: 340,
                        mx: 'auto',
                        mt: 2,
                        borderRadius: 5,
                        background: '#11182a',
                        p: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Avatar
                        sx={{
                            bgcolor: '#eee',
                            width: 70,
                            height: 70,
                            mb: 2,
                            fontSize: 40,
                            color: '#666',
                        }}
                        alt={user?.nickname}
                        src={imgSrc}
                    />
                    <Typography
                        variant="body2"
                        sx={{
                            color: '#b3bccb',
                            mb: 0.5,
                            fontSize: '0.5rem',
                            fontFamily: 'Roboto, sans-serif',
                            fontWeight: 400,
                        }}
                    >
                        닉네임 : {user?.nickname}
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: '#b3bccb',
                            mb: 2,
                            fontSize: '0.5rem',
                            fontFamily: 'Roboto, sans-serif',
                            fontWeight: 400,
                        }}
                    >
                        이메일: {user?.email}
                    </Typography>
                    <Button
                        fullWidth
                        variant="contained"
                        sx={{
                            background: '#232646',
                            color: '#e7eaf2',
                            fontWeight: 'bold',
                            borderRadius: 2,
                            mb: 2,
                            boxShadow: 'none',
                            '&:hover': { background: '#323455' },
                        }}
                        onClick={() => setOpenEditModal(true)}
                    >
                        계정 정보 수정
                    </Button>
                    <Typography
                        variant="subtitle2"
                        sx={{
                            color: '#b3bccb',
                            mb: 1,
                            width: '100%',
                            textAlign: 'left',
                        }}
                    >
                        앱 설정
                    </Typography>
                    <Button
                        fullWidth
                        sx={{
                            background: '#232646',
                            color: '#e7eaf2',
                            fontWeight: 'bold',
                            borderRadius: 2,
                            mb: 1,
                            boxShadow: 'none',
                            '&:hover': { background: '#323455' },
                        }}
                    >
                        디스플레이 설정
                    </Button>
                    <Button
                        fullWidth
                        sx={{
                            background: '#232646',
                            color: '#e7eaf2',
                            fontWeight: 'bold',
                            borderRadius: 2,
                            mb: 2,
                            boxShadow: 'none',
                            '&:hover': { background: '#323455' },
                        }}
                    >
                        문의하기
                    </Button>
                    <Divider sx={{ width: '100%', my: 1, background: '#203060' }} />
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                        <Button variant="text" sx={{ color: '#b3bccb', px: 2 }} onClick={logout}>
                            로그아웃
                        </Button>
                        <Button 
                            variant="text" 
                            sx={{ color: '#b3bccb', px: 2 }} 
                            onClick={() => setOpenDeleteDialog(true)}
                        >
                            탈퇴하기
                        </Button>
                    </Box>
                </Paper>
            </Box>
            {/* 모달 연결 */}
            <EditProfileModal 
                user={user} 
                open={openEditModal} 
                onClose={handleModalClose}
                onSuccess={handleUpdate}
            />

            {/* 탈퇴 확인 다이얼로그 */}
            <Dialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
            >
                <DialogTitle id="delete-dialog-title">
                    회원 탈퇴
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        정말 탈퇴하시겠습니까? 탈퇴하시면 모든 데이터가 삭제되며 복구할 수 없습니다.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
                        취소
                    </Button>
                    <Button onClick={handleDeleteAccount} color="error" variant="contained">
                        탈퇴하기
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 스낵바 */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    variant="filled"
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <NavBar />
        </ContainerBox>
    );
}
