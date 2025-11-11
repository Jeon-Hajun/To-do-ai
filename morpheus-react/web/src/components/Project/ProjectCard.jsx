import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import { getMembers } from "../../api/projects";
import { getUser } from "../../utils/auth";

export default function ProjectCard({ project }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = getUser();
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
  }, [project.id]);

  const handleCardClick = () => {
    if (project.id) navigate(`/project/${project.id}`, { state: { project } });
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
                  alt={m.nickname || m.email || "알 수 없음"}
                  src={m.avatarUrl || ""}
                  sx={{ width: 32, height: 32 }}
                />
              ))}
            </AvatarGroup>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {members.map((m) => m.nickname || m.email || "알 수 없음").join(", ")}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
