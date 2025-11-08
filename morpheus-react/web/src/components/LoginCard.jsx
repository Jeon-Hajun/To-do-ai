// src/components/LoginCard.jsx
import React, { useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import ValidatedEmailInput from './ui/ValidatedEmailInput';
import Input from './ui/Input';
import LoginButton from './ui/LoginButton';

export default function LoginCard({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <Paper
            elevation={3}
            sx={{
                p: 4,
                maxWidth: 450,
                width: '100%',
                textAlign: 'center',
            }}
        >
            <Typography variant="h5" sx={{ mb: 3 }}>
                로그인
            </Typography>

            <form>
                <ValidatedEmailInput value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 3 }} />

                <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    sx={{ mb: 3 }}
                />

                <LoginButton email={email} password={password} onLoginSuccess={onLoginSuccess} />
            </form>
        </Paper>
    );
}
