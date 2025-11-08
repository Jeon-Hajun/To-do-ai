import React from "react";
import Card from "../ui/Card";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";

export default function ProjectCard({ project, onClick }) {
  return (
    <Card
      title={project.name}
      onClick={() => onClick(project)} // 클릭 이벤트 전달
      sx={{ mb: 2 }}
    >
      <Stack direction="row" spacing={1} mt={1}>
        {project.participants.map((p) => (
          <Avatar
            key={p.id}
            alt={p.name}
            src={p.avatar}
            sx={{ width: 32, height: 32 }}
          />
        ))}
      </Stack>
    </Card>
  );
}
