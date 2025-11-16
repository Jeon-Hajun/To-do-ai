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
      <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>
        {project.title}
      </Typography>

      {/* 프로젝트 상세 설명 카드 */}
      <Box p={3} boxShadow={1} borderRadius={2}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
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


        <Stack direction="row" spacing={1} mt={2} alignItems="center" flexWrap="wrap">
          <AvatarGroup max={4}>
            {members.map((m) => (
              <Avatar
                key={m.id}
                alt={m.nickname || m.email}
                src={getProfileImageSrc(m.profileImage, true)}
                sx={{ width: 32, height: 32 }}
              >
                {m.nickname?.[0] || m.email?.[0]}
              </Avatar>
            ))}
          </AvatarGroup>
          
          {/* 멤버 역할 표시 */}
          {members.length > 0 && (
            <Stack direction="row" spacing={0.5} sx={{ ml: 1 }} flexWrap="wrap">
              {members.map((m) => (
                <Chip
                  key={m.id}
                  label={`${m.nickname || m.email}: ${m.role === 'owner' ? '소유자' : '멤버'}`}
                  size="small"
                  color={m.role === 'owner' ? 'primary' : 'default'}
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
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
      <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: "center" }}>
        <EditProject project={project} />
        <DeleteOrLeaveProject projectId={project.id} mode="delete" />
      </Stack>
    </Box>
  );
}
