import React, { useEffect, useState } from 'react';
import JoinProject from './JoinProject';
import ProjectList from './ProjectList';
import ProjectDetailModal from './ProjectDetailModal';
import { getUserProjects } from '../../api/projects';
import Button from '@mui/material/Button'; // ✅ MUI 버튼 사용
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function ProjectManager() {
    const [projects, setProjects] = useState([]);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);

    const fetchProjects = async () => {
        const list = await getUserProjects();
        setProjects(list);
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleJoin = (project) => {
        if (project && !projects.find((p) => p.id === project.id)) {
            setProjects((prev) => [...prev, project]);
        }
        setIsJoinModalOpen(false);
    };

    const handleCardClick = (project) => {
        setSelectedProject(project);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                alignItems: 'center', // ✅ 중앙 정렬
                mt: 4,
                px: 2,
            }}
        >
            {/* ✅ 제목 영역 */}
            <Typography variant="h5" fontWeight="bold" color="text.primary" sx={{ mb: 1 }}>
                내 프로젝트
            </Typography>

            {/* ✅ 버튼 영역 */}
            <Button
                variant="contained"
                onClick={() => setIsJoinModalOpen(true)}
                sx={{
                    background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                    color: '#fff',
                    fontWeight: 'bold',
                    textTransform: 'none',
                    fontSize: '1rem',
                    borderRadius: '50px',
                    px: 4,
                    py: 1.5,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                        transform: 'translateY(-2px)',
                    },
                }}
            >
                프로젝트 참가
            </Button>

            {/* ✅ 프로젝트 리스트 (중앙 폭 제한) */}
            <Box sx={{ width: '100%', maxWidth: 900 }}>
                <ProjectList projects={projects} onSelect={handleCardClick} />
            </Box>

            {isJoinModalOpen && <JoinProject onJoin={handleJoin} />}
            {selectedProject && (
                <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />
            )}
        </Box>
    );
}
