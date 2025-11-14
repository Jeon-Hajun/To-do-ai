import React from "react";
import {
  Box,
  Typography,
  Avatar,
  AvatarGroup,
  Stack,
} from "@mui/material";
import DeleteOrLeaveProject from "./ProjectActions/DeleteOrLeaveProject";
import EditProject from "./ProjectActions/EditProject";
import { useProjectDetail } from "../../hooks/useProjectDetail";
import { useAuthContext } from "../../context/AuthContext";
import { List } from "../tasks";
import { getProfileImageSrc } from "../../utils/profileImage";


export default function ProjectDetailCard({ projectId, showTaskList = true }) {
  const { project, members, loading, error } = useProjectDetail(projectId);
  const { user: currentUser } = useAuthContext();
  const isOwner = String(currentUser?.id) === String(project?.ownerId);


  if (loading) return <Typography>로딩중...</Typography>;
  if (error) {
    console.error(error);
    return <Typography color="error">프로젝트 정보를 불러오는데 실패했습니다.</Typography>;
  }

  return (
    <Box p={3} boxShadow={3} borderRadius={2}>
      <Typography variant="h5">{project.title}</Typography>
      <Typography variant="body2" color="text.secondary">{project.description}</Typography>

      {/* 프로젝트 코드 표시 */}
      {project.isShared && project.projectCode && (
        <Typography variant="body2" color="text.secondary" mt={1}>
          프로젝트 코드: <strong>{project.projectCode}</strong>
        </Typography>
      )}

      <Stack direction="row" spacing={2} mt={2} alignItems="center">
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

        {/* 오너이면 삭제 버튼, 아니면 나가기 버튼 */}
        <DeleteOrLeaveProject projectId={project.id} mode={isOwner ? "delete" : "leave"} />

        {/* 오너면 수정 버튼 */}
        {isOwner && <EditProject project={project} />}
      </Stack>
      {/* showTaskList가 true일 때만 List 렌더링 */}
      {showTaskList && (
        <List projectId={projectId} />
      )}
    </Box>
  );
}
