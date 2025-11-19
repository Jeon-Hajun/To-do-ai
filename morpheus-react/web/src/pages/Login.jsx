import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  Button,
  Card as MuiCard,
  CardContent,
  CardHeader,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useAuthContext } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const { login } = useAuthContext();

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setEmailError(val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val));
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/home');
      } else {
        setError(res.error?.message || '로그인 실패. 이메일 또는 비밀번호를 확인하세요.');
      }
    } catch (err) {
      console.error(err);
      setError('로그인 실패. 이메일 또는 비밀번호를 확인하세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupClick = () => {
    navigate('/signup');
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100vw',
        height: '100vh',
        bgcolor: theme.palette.background.default,
        margin: 0,
        padding: 2,
        zIndex: 1,
      }}
    >
      <MuiCard
        variant="elevation"
        elevation={3}
        sx={{
          width: 450,
          maxWidth: '100%',
          textAlign: 'center',
          p: 4,
          borderRadius: theme.shape.borderRadius,
          bgcolor: theme.palette.background.paper,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <Box
          component="img"
          src="/app-logo.png"
          alt="PM Agent"
          onError={(e) => {
            console.error('로고 이미지 로드 실패:', e);
          }}
          sx={{
            width: 120,
            height: 'auto',
            mx: 'auto',
            mb: 2,
            objectFit: 'contain',
            display: 'block',
          }}
        />
        <CardHeader
          title={
            <Typography
              variant="h5"
              sx={{
                color: theme.palette.text.primary,
                fontWeight: 600,
              }}
            >
              로그인
            </Typography>
          }
        />
        <CardContent>
          <form onSubmit={handleLogin}>
            <TextField
              label="Email"
              value={email}
              onChange={handleEmailChange}
              error={emailError}
              helperText={emailError ? "올바른 이메일 형식이 아닙니다." : ""}
              fullWidth
              variant="outlined"
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: theme.shape.borderRadius,
                },
              }}
            />

            <TextField
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: theme.shape.borderRadius,
                },
              }}
            />

            {error && (
              <Box
                sx={{
                  color: theme.palette.error.main,
                  marginTop: 1,
                  marginBottom: 2,
                  fontSize: '0.9rem',
                  textAlign: 'center'
                }}
              >
                {error}
              </Box>
            )}

            <Button
              type="submit"
              fullWidth
              onClick={handleLogin}
              disabled={loading}
              sx={{
                mt: 2,
                py: 1.75,
                fontWeight: 600,
                borderRadius: theme.shape.borderRadius,
                background: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                color: '#fff',
                textTransform: 'none',
                fontSize: '1.1rem',
                boxShadow: '0 4px 14px 0 rgba(0,0,0,0.25)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  boxShadow: '0 6px 20px 0 rgba(0,0,0,0.3)',
                  transform: 'translateY(-2px)',
                },
                '&:disabled': {
                  background: theme.palette.grey[300],
                },
              }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>

            <Button
              fullWidth
              onClick={handleSignupClick}
              sx={{
                mt: 2,
                py: 1.75,
                fontWeight: 600,
                borderRadius: theme.shape.borderRadius,
                background: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                color: "#fff",
                textTransform: "none",
                fontSize: "1.1rem",
                boxShadow: '0 4px 14px 0 rgba(0,0,0,0.25)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  boxShadow: '0 6px 20px 0 rgba(0,0,0,0.3)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              회원가입
            </Button>
          </form>
        </CardContent>
      </MuiCard>
    </Box>
  );
}
