import React from "react";
import {
  Box,
  Typography,
  Avatar,
  AvatarGroup,
  Stack,
  Chip,
} from "@mui/material";
import DeleteOrLeaveProject from "./ProjectActions/DeleteOrLeaveProject";
import EditProject from "./ProjectActions/EditProject";
import { useProjectDetail } from "../../hooks/useProjectDetail";
import { useAuthContext } from "../../context/AuthContext";
import { List } from "../tasks";
import { getProfileImageSrc } from "../../utils/profileImage";
import ProjectProgressCard from "./ProjectProgressCard";
import MarkdownRenderer from "../common/MarkdownRenderer";


export default function ProjectDetailCard({ projectId, showTaskList = true }) {
  const { project, members, loading, error } = useProjectDetail(projectId);


  if (loading) return <Typography>로딩중...</Typography>;
  if (error) {
    console.error(error);
    return <Typography color="error">프로젝트 정보를 불러오는데 실패했습니다.</Typography>;
  }

  return (
    <Box>
      {/* 프로젝트명 */}
      <Typography variant={{ xs: "h5", md: "h4" }} sx={{ mb: { xs: 1.5, md: 2 }, fontWeight: "bold", fontSize: { xs: "1.5rem", md: "2.125rem" } }}>
        {project.title}
      </Typography>

      {/* 프로젝트 상세 설명 카드 */}
      <Box p={{ xs: 1.5, sm: 2, md: 3 }} boxShadow={1} borderRadius={2}>
        <Typography variant={{ xs: "h6", md: "h6" }} sx={{ mb: { xs: 1.5, md: 2 }, fontWeight: "bold", fontSize: { xs: "1rem", md: "1.25rem" } }}>
          프로젝트 상세 설명
        </Typography>
        {project.description ? (
          <Box
            sx={{
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              maxHeight: 400,
              overflowY: "auto",
            }}
          >
            <MarkdownRenderer 
              content={project.description} 
              sx={{ 
                "& p": { 
                  color: "text.secondary",
                  fontSize: "0.875rem",
                } 
              }} 
            />
          </Box>
        ) : (
          <Box
            sx={{
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              프로젝트 설명이 없습니다.
            </Typography>
          </Box>
        )}


        <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 1 }} mt={2} alignItems={{ xs: "flex-start", sm: "center" }} flexWrap="wrap">
          <AvatarGroup max={4}>
            {members.map((m) => (
              <Avatar
                key={m.id}
                alt={m.nickname || m.email}
                src={getProfileImageSrc(m.profileImage, true)}
                sx={{ width: { xs: 28, md: 32 }, height: { xs: 28, md: 32 } }}
              >
                {m.nickname?.[0] || m.email?.[0]}
              </Avatar>
            ))}
          </AvatarGroup>
          
          {/* 멤버 역할 표시 */}
          {members.length > 0 && (
            <Stack direction="row" spacing={0.5} sx={{ ml: { xs: 0, sm: 1 }, mt: { xs: 1, sm: 0 } }} flexWrap="wrap">
              {members.map((m) => (
                <Chip
                  key={m.id}
                  label={`${m.nickname || m.email}: ${m.role === 'owner' ? '소유자' : '멤버'}`}
                  size="small"
                  color={m.role === 'owner' ? 'primary' : 'default'}
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.65rem', md: '0.7rem' }, height: { xs: 18, md: 20 } }}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Box>

      {/* 진행도 카드 */}
      <Box sx={{ mt: 2 }}>
        <ProjectProgressCard projectId={projectId} />
      </Box>

      {/* showTaskList가 true일 때만 List 렌더링 */}
      {showTaskList && (
        <Box sx={{ mt: 2 }}>
          <List projectId={projectId} />
        </Box>
      )}

      {/* 삭제/수정 버튼 */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }} sx={{ mt: { xs: 2, md: 3 }, justifyContent: "center" }}>
        <EditProject project={project} />
        <DeleteOrLeaveProject projectId={project.id} mode="delete" />
      </Stack>
    </Box>
  );
}
