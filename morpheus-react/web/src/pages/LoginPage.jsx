import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import ContainerBox from '../components/ui/ContainerBox';
import ValidatedEmailInput from '../components/ui/ValidatedEmailInput';
import Input from '../components/ui/Input';
import GoSignupButton from '../components/ui/GoSignupButton';
import LoginButton from '../components/ui/LoginButton'; // ✅ LoginButton 불러오기
import { useAuthContext } from '../context/AuthContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { login } = useAuthContext();

    // ✅ 로그인 성공 시 페이지 이동
    const handleLoginSuccess = (data) => {
        console.log('로그인 성공:', data);
        navigate('/main');
    };

    return (
        <ContainerBox
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                p: 2,
                backgroundColor: '#f5f5f5',
            }}
        >
            <Card
                title="로그인"
                sx={{
                    width: 450,
                    maxWidth: '100%',
                    textAlign: 'center',
                    p: 4,
                }}
            >
                <form onSubmit={(e) => e.preventDefault()}>
                    {/* 이메일 입력 */}
                    <ValidatedEmailInput value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 3 }} />

                    {/* 비밀번호 입력 */}
                    <Input
                        label="비밀번호"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    {/* ✅ LoginButton 적용 (기존 로그인 버튼 대신) */}
                    <LoginButton
                        email={email}
                        password={password}
                        onLoginSuccess={handleLoginSuccess}
                        sx={{ width: '100%' }}
                    />

                    <GoSignupButton />
                </form>
            </Card>
        </ContainerBox>
    );
}
