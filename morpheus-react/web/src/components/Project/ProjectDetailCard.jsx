// src/components/Project/ProjectDetailCard.jsx
import React, { useEffect, useState } from "react";
import { Box, Typography, Stack, Avatar, AvatarGroup, Button, TextField, CircularProgress } from "@mui/material";
import { getMembers, leaveProject, deleteProject, updateProject, connectGithubRepo } from "../../api/projects";
import { useAuthContext } from "../../context/AuthContext";
import { getProfileImageSrc } from "../../utils/profileImage";

export default function ProjectDetailCard({ project }) {
  const { user: currentUser } = useAuthContext();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [githubRepoInput, setGithubRepoInput] = useState(project.githubRepo || "");
  const [updatingGithub, setUpdatingGithub] = useState(false);

  // 멤버 정보 불러오기 + 오너 여부 판단
  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const res = await getMembers(project.id);
        if (res.success) {
          const memberList = res.data.members || [];
          setMembers(memberList);

          const owner = memberList.find((m) => m.role === "owner");
          setIsOwner(owner
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
    if (currentUser?.id) {
      fetchMembers();
    }
  }, [project.id, currentUser?.id, project.ownerId, currentUser?.profileImage]); // 프로필 이미지가 변경될 때도 멤버 정보 다시 불러오기

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
    if (res.success) project.title = newTitle;
    else alert("수정 실패");
  };

  const handleUpdateGithub = async () => {
    setUpdatingGithub(true);
    try {
      const res = await connectGithubRepo(project.id, githubRepoInput);
      if (res.success) {
        alert("GitHub 연결 완료");
        project.githubRepo = githubRepoInput;
      } else alert("GitHub 연결 실패");
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingGithub(false);
    }
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

      <Typography variant="h6" sx={{ mt: 2 }}>GitHub 저장소</Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <TextField
          value={githubRepoInput}
          onChange={(e) => setGithubRepoInput(e.target.value)}
          fullWidth
          placeholder="GitHub URL"
        />
        {isOwner && (
          <Button variant="contained" onClick={handleUpdateGithub} disabled={updatingGithub}>
            {updatingGithub ? <CircularProgress size={20}/> : "연결/수정"}
          </Button>
        )}
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
