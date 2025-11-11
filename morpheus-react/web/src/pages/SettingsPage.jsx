import React, { useState } from 'react';
import { Box, Paper, Avatar, Typography, Divider, Button } from '@mui/material';
import useAuth from '../hooks/useAuth';
import Header from '../components/ui/Header';
import NavBar from '../components/ui/NavBar';
import ContainerBox from '../components/ui/ContainerBox';
import PageContainer from '../components/ui/PageContainer';
import EditProfileModal from '../components/EditProfileModal';

export default function SettingsPage() {
    const { user, loading, logout } = useAuth();
    const [openEditModal, setOpenEditModal] = useState(false);

    // 캐시 무효화를 위한 timestamp 추가
    const imgSrc = user?.profileImage ? `/profile/${user.profileImage}?t=${Date.now()}` : `/profile/basic.png`;

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
                        alt={user.nickname}
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
                        닉네임 : {user.nickname}
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
                        이메일: {user.email}
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
                        <Button variant="text" sx={{ color: '#b3bccb', px: 2 }}>
                            탈퇴하기
                        </Button>
                    </Box>
                </Paper>
            </Box>
            {/* 모달 연결 */}
            <EditProfileModal user={user} open={openEditModal} onClose={() => setOpenEditModal(false)} />
            <NavBar />
        </ContainerBox>
    );
}
