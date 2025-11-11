// src/components/Project/ProjectCard.jsx
import React, { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import { getMembers } from "../../api/projects";
import { getUser } from "../../utils/auth";

export default function ProjectCard({ project, onLeave, onDelete, onUpdate }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const currentUser = getUser();
  if (!project || !currentUser) return null;

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const res = await getMembers(project.id);
        if (res.success) {
          const membersList = res.data.members || [];
          setMembers(membersList);

          const owner = membersList.find((m) => m.role === "owner");
          if (owner) setIsOwner(String(owner.id) === String(currentUser.id));
          else setIsOwner(String(project.ownerId) === String(currentUser.id));
        }
      } catch (error) {
        console.error("멤버 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [project.id, currentUser.id, project.ownerId]);

  return (
    <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
      <CardContent>
        {/* 제목 */}
        <Typography variant="h6" sx={{ mb: 1 }}>
          {project.title}
        </Typography>

        {/* 프로젝트 멤버 표시 */}
        {!loading && members.length > 0 && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <AvatarGroup max={5}>
              {members.map((m) => (
                <Avatar
                  key={m.id}
                  alt={m.nickname || m.email}
                  src={m.avatarUrl || ""}
                  sx={{ width: 32, height: 32 }}
                />
              ))}
            </AvatarGroup>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {members.map((m) => m.nickname || m.email).join(", ")}
            </Typography>
          </Stack>
        )}
      </CardContent>

      {/* 버튼 영역 */}
      <CardActions>
        <Stack direction="row" spacing={1}>
          {isOwner ? (
            <>
              {onUpdate && (
                <Button variant="contained" color="primary" onClick={() => onUpdate(project)}>
                  수정
                </Button>
              )}
              {onDelete && (
                <Button variant="contained" color="error" onClick={() => onDelete(project.id)}>
                  삭제
                </Button>
              )}
            </>
          ) : (
            onLeave && (
              <Button variant="contained" color="primary" onClick={() => onLeave(project.id)}>
                나가기
              </Button>
            )
          )}
        </Stack>
      </CardActions>
    </Card>
  );
}
