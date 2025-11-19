import React, { useEffect, useState } from 'react';
import { Box, Typography, Fade } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export default function LoadingScreen({ onComplete }) {
  const theme = useTheme();
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 페이드 인 애니메이션
    setFadeIn(true);
    
    // 최소 1.5초 표시 후 페이드 아웃
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 500); // 페이드 아웃 애니메이션 시간
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <Fade in={!fadeOut} timeout={500}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: theme.palette.background.default,
          zIndex: 9999,
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 0.5s ease-in',
        }}
      >
        <Box
          component="img"
          src="/app-logo.png"
          alt="PM Agent Logo"
          onError={(e) => {
            console.error('로고 이미지 로드 실패:', e);
          }}
          sx={{
            width: { xs: 120, sm: 150, md: 180 },
            height: 'auto',
            mb: 3,
            objectFit: 'contain',
            display: 'block',
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': {
                opacity: 1,
                transform: 'scale(1)',
              },
              '50%': {
                opacity: 0.8,
                transform: 'scale(1.05)',
              },
            },
          }}
        />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: theme.palette.primary.main,
            letterSpacing: 2,
            animation: 'fadeInUp 0.8s ease-out',
            '@keyframes fadeInUp': {
              '0%': {
                opacity: 0,
                transform: 'translateY(20px)',
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          agent
        </Typography>
      </Box>
    </Fade>
  );
}

