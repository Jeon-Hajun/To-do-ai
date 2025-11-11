// src/components/Project/ProjectDetailCard.jsx
import React, { useEffect, useState } from "react";
import { Box, Typography, Stack, Avatar, AvatarGroup, Button, CircularProgress } from "@mui/material";
import { getMembers, leaveProject, deleteProject, updateProject } from "../../api/projects";
import { useAuthContext } from "../../context/AuthContext";
import { useProject } from "../../context/ProjectContext";
import { getProfileImageSrc } from "../../utils/profileImage";

export default function ProjectDetailCard({ project: initialProject }) {
  const { user: currentUser } = useAuthContext();
  const { updateProjectTitle } = useProject();

  const [project, setProject] = useState(initialProject);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const res = await getMembers(project.id);
        if (res.success) {
          const memberList = res.data.members || [];
          setMembers(memberList);

          const owner = memberList.find((m) => m.role === "owner");
          setIsOwner(
            owner
              ? String(owner.id) === String(currentUser?.id)
              : String(project.ownerId) === String(currentUser?.id)
          );
        }
      } catch (err) {
        console.error("멤버 조회 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser?.id) fetchMembers();
  }, [project.id, currentUser?.id, project.ownerId, currentUser?.profileImage]);

  const handleLeave = async () => {
    if (!window.confirm("정말 프로젝트에서 나가시겠습니까?")) return;
    const res = await leaveProject(project.id);
    if (res.success) window.location.reload();
    else alert("나가기 실패");
  };

  const handleDelete = async () => {
    if (!window.confirm("정말 프로젝트를 삭제하시겠습니까?")) return;
    const res = await deleteProject(project.id);
    if (res.success) window.location.reload();
    else alert("삭제 실패");
  };

  const handleUpdateTitle = async () => {
    const newTitle = prompt("새 프로젝트 제목을 입력하세요", project.title);
    if (!newTitle) return;
    const res = await updateProject(project.id, { title: newTitle });
    if (res.success) {
      setProject(prev => ({ ...prev, title: newTitle })); // 로컬 상태 갱신
      updateProjectTitle(project.id, newTitle); // Context에도 반영
    } else alert("수정 실패");
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">{project.title}</Typography>

      <Typography variant="h6" sx={{ mt: 2 }}>멤버</Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <AvatarGroup max={5}>
          {members.map(m => (
            <Avatar key={m.id} alt={m.nickname || m.email} src={getProfileImageSrc(m.profileImage, true)} />
          ))}
        </AvatarGroup>
        <Typography>{members.map(m => m.nickname || m.email).join(", ")}</Typography>
      </Stack>

      <Stack direction="row" spacing={2}>
        {isOwner && (
          <>
            <Button variant="contained" color="primary" onClick={handleUpdateTitle}>제목 수정</Button>
            <Button variant="contained" color="error" onClick={handleDelete}>삭제</Button>
          </>
        )}
        {!isOwner && (
          <Button variant="contained" color="primary" onClick={handleLeave}>나가기</Button>
        )}
      </Stack>
    </Box>
  );
}
