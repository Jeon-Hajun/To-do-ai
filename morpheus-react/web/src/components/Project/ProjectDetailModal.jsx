import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';

export default function ProjectDetailModal({ project, onClose }) {
    if (!project) return null;

    return (
        <Modal open={true} onClose={onClose}>
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '90vw',
                    maxWidth: 600,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 24,
                    p: 3,
                }}
            >
                <Typography variant="h6" gutterBottom>
                    {project.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    코드: {project.code}
                </Typography>

                {/* 참가자 목록 */}
                <Box mt={2}>
                    <Typography variant="subtitle1">참가자</Typography>
                    <Stack direction="row" spacing={2} mt={1} flexWrap="wrap">
                        {project.participants.map((p) => (
                            <Stack key={p.id} alignItems="center" spacing={0.5}>
                                <Avatar src={p.avatar} sx={{ width: 40, height: 40 }} />
                                <Typography variant="caption">{p.name}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>

                {/* 테스크 목록 */}
                <Box mt={3}>
                    <Typography variant="subtitle1">테스크</Typography>
                    {project.tasks?.length ? (
                        <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                            {project.tasks.map((t) => (
                                <li key={t.id}>
                                    <Typography variant="body2">
                                        {t.title} - {t.status}
                                    </Typography>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Typography variant="body2" color="text.secondary" mt={1}>
                            등록된 테스크가 없습니다.
                        </Typography>
                    )}
                </Box>

                {/* 닫기 버튼 */}
                <Stack direction="row" justifyContent="flex-end" mt={3}>
                    <Button type="default" onClick={onClose}>
                        닫기
                    </Button>
                </Stack>
            </Box>
        </Modal>
    );
}
