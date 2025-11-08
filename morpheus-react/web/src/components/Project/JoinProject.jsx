import React, { useState } from 'react';
import { joinProjectByCode } from '../../api/projects';
import Card from '../ui/Card';
import Button from '../ui/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';

export default function JoinProject({ onJoin }) {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleJoin = async () => {
        if (!code || !name) {
            setError('프로젝트 코드와 이름을 입력해주세요.');
            return;
        }
        try {
            const project = await joinProjectByCode(code, name);
            onJoin(project);
        } catch (err) {
            setError(err.message || '참가 실패');
        }
    };

    const handleClose = () => {
        onJoin(null); // 취소 시 모달 닫기
    };

    return (
        <Modal open={true} onClose={handleClose}>
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    borderRadius: 2,
                    p: 4,
                    width: 400,
                }}
            >
                <h2 style={{ textAlign: 'center', marginBottom: '16px' }}>프로젝트 참가</h2>

                <Stack spacing={2}>
                    <TextField
                        label="프로젝트 코드 입력"
                        variant="outlined"
                        fullWidth
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />
                    <TextField
                        label="프로젝트에서 보여질 이름"
                        variant="outlined"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    {error && <div style={{ color: 'red', fontSize: '0.9rem' }}>{error}</div>}
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button type="default" onClick={handleClose}>
                            취소
                        </Button>
                        <Button type="default" onClick={handleJoin}>
                            참가
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        </Modal>
    );
}
