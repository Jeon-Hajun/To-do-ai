import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import { fetchProjectMembers } from "../../api/projects";
import { useAuthContext } from "../../context/AuthContext";
import { getProfileImageSrc } from "../../utils/profileImage";

export default function ProjectCard({ project, onClick, onLeave, onDelete, onUpdate }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!project || !currentUser) return;
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const membersList = await fetchProjectMembers(project.id);
        setMembers(membersList || []);
      } catch (error) {
        console.error("멤버 조회 실패:", error);
        // 에러가 발생해도 빈 배열로 설정하여 UI가 깨지지 않도록 함
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [project?.id, currentUser?.id]);

  if (!project || !currentUser) return null;

  const handleCardClick = () => {
    if (!project?.id) return;
    if (onClick) {
      onClick(project.id);
    } else {
      navigate(`/projects/${project.id}`);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{ mb: 2, borderRadius: 2, cursor: "pointer" }}
      onClick={handleCardClick}
    >
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {project.title || "제목 없음"}
        </Typography>

        {!loading && members.length > 0 && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <AvatarGroup max={5}>
              {members.map((m) => (
                <Avatar
                  key={m.id || Math.random()}
                  alt={m.nickname || m.email}
                  src={getProfileImageSrc(m.profileImage, true)}
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
    </Card>
  );
}
