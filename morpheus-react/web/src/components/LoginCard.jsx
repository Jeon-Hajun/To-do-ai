import React, { useState } from 'react';
import { Typography, Box } from '@mui/material';
import Card from './ui/Card';
import ValidatedEmailInput from './ui/ValidatedEmailInput';
import Input from './ui/Input';
import LoginButton from './ui/LoginButton';

export default function LoginCard({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <Card
            title="로그인"
            sx={{
                maxWidth: 450,
                mx: 'auto',
                textAlign: 'center',
                p: 4,
            }}
        >
            <form>
                <ValidatedEmailInput
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    sx={{ mb: 3 }}
                />

                <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    sx={{ mb: 3 }}
                />

                <LoginButton
                    email={email}
                    password={password}
                    onLoginSuccess={onLoginSuccess}
                />
            </form>
        </Card>
    );
}
