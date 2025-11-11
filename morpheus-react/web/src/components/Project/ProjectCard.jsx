import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import { getMembers } from "../../api/projects";
import { useAuthContext } from "../../context/AuthContext";
import { useProject } from "../../context/ProjectContext";
import { getProfileImageSrc } from "../../utils/profileImage";

export default function ProjectCard({ project }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuthContext();
  const { setCurrentProject } = useProject(); // ✅ 프로젝트 선택 업데이트
  const navigate = useNavigate();

  if (!project || !currentUser) return null;

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const res = await getMembers(project.id);
        if (res.success) setMembers(res.data.members || []);
      } catch (error) {
        console.error("멤버 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [project.id, currentUser?.profileImage]);

  const handleCardClick = () => {
    if (!project?.id) return;
    setCurrentProject(project); // ✅ 헤더에 표시될 프로젝트 설정
    navigate(`/project/${project.id}`, { state: { project } });
  };

  return (
    <Card
      variant="outlined"
      sx={{ mb: 2, borderRadius: 2, cursor: project.id ? "pointer" : "default" }}
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
