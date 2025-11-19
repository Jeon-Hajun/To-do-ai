import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  Button,
  Card as MuiCard,
  CardContent,
  Typography,
  CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { signupUser, checkEmailDuplicate } from '../api/auth';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [emailDuplicateError, setEmailDuplicateError] = useState('');
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();

  // 이메일 중복 확인 (디바운싱)
  useEffect(() => {
    if (!email || emailError) {
      setEmailDuplicateError('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailDuplicateError('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingDuplicate(true);
      setEmailDuplicateError('');
      try {
        const res = await checkEmailDuplicate(email);
        if (res.success) {
          if (!res.data.available) {
            setEmailDuplicateError('이미 사용 중인 이메일입니다.');
          } else {
            setEmailDuplicateError('');
          }
        }
      } catch (err) {
        console.error('이메일 중복 확인 오류:', err);
        // 중복 확인 실패해도 회원가입은 진행 가능하도록 함
      } finally {
        setCheckingDuplicate(false);
      }
    }, 500); // 500ms 디바운싱

    return () => clearTimeout(timeoutId);
  }, [email, emailError]);

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setEmailError(val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val));
    setEmailDuplicateError(''); // 입력 중에는 중복 에러 초기화
  };

  const handleSignup = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    if (!email || !password || !nickname) {
      setError('모든 필드를 입력해주세요.');
      setLoading(false);
      return;
    }

    if (emailError) {
      setError('올바른 이메일 형식을 입력해주세요.');
      setLoading(false);
      return;
    }

    if (emailDuplicateError) {
      setError('이미 사용 중인 이메일입니다.');
      setLoading(false);
      return;
    }

    try {
      const res = await signupUser(email, password, nickname);
      if (res.success) {
        alert('회원가입이 완료되었습니다. 로그인해주세요.');
        navigate('/login');
      } else {
        setError(res.error?.message || '회원가입 실패');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error?.message || '회원가입 실패');
    } finally {
      setLoading(false);
    }
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
          position: 'relative',
        }}
      >
        {/* 뒤로가기 버튼 */}
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate(-1)}
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          ← 뒤로
        </Button>

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

        <Typography
          variant="h5"
          sx={{ 
            color: theme.palette.text.primary,
            fontWeight: 600,
            mb: 3,
          }}
        >
          회원가입
        </Typography>

        <CardContent>
          <form onSubmit={handleSignup}>
            {/* 이메일 입력 */}
            <TextField
              label="Email"
              value={email}
              onChange={handleEmailChange}
              error={emailError || !!emailDuplicateError}
              helperText={
                emailError 
                  ? "올바른 이메일 형식이 아닙니다." 
                  : emailDuplicateError 
                    ? emailDuplicateError
                    : checkingDuplicate
                      ? "중복 확인 중..."
                      : ""
              }
              fullWidth
              variant="outlined"
              InputProps={{
                endAdornment: checkingDuplicate ? (
                  <CircularProgress size={20} />
                ) : null,
              }}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: theme.shape.borderRadius,
                },
              }}
            />

            {/* 닉네임 입력 */}
            <TextField
              label="Nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: theme.shape.borderRadius,
                },
              }}
            />

            {/* 비밀번호 입력 */}
            <TextField
              label="Password"
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

            {/* 에러 메시지 */}
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

            {/* 회원가입 버튼 */}
            <Button
              type="submit"
              fullWidth
              onClick={handleSignup}
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
              {loading ? '회원가입 중...' : '회원가입'}
            </Button>
          </form>
        </CardContent>
      </MuiCard>
    </Box>
  );
}

