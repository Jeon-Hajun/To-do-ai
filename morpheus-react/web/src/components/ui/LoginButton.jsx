import React, { useState } from 'react';
import Button from '@mui/material/Button';
import axios from 'axios';
import { setAuth } from '../../utils/auth';
import { useAuthContext } from '../../context/AuthContext';
import { useTheme } from '@mui/material/styles';

const API_URL = 'http://localhost:5000/api/user';

export default function LoginButton({ email, password, onLoginSuccess, sx, ...props }) {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuthContext();

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
            const res = await axios.post(`${API_URL}/login`, { email, password });
            const token = res.data.data.token;

            if (!token) throw new Error('Token not received');

            setAuth({ token });
            await login(token);
            if (onLoginSuccess) onLoginSuccess(res.data);
        } catch (err) {
            console.error(err);
            setError('로그인 실패. 이메일 또는 비밀번호를 확인하세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
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
                    ...sx,
                }}
                {...props}
            >
                {loading ? '로그인 중...' : '로그인'}
            </Button>

            {error && (
                <div style={{ color: theme.palette.error.main, marginTop: 8, fontSize: '0.9rem' }}>
                    {error}
                </div>
            )}
        </>
    );
}
