import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { isProjectOwner } from "../../utils/auth";

export default function ProjectCard({ project, currentUser, onLeave, onDelete, onUpdate }) {
  if (!project) return null;

  const isOwner = isProjectOwner(currentUser, project);

  return (
    <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6">{project.title}</Typography>
        {project.description && (
          <Typography variant="body2" color="text.secondary">
            {project.description}
          </Typography>
        )}
      </CardContent>
      <CardActions>
        <Stack direction="row" spacing={1}>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={() => onLeave(project.id)}
          >
            나가기
          </Button>

          <Button 
            variant="contained" 
            color="error" 
            onClick={() => onDelete(project.id)}
          >
            삭제
          </Button>

          {onUpdate && (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => onUpdate(project)}
            >
              수정
            </Button>
          )}
        </Stack>
      </CardActions>
    </Card>
  );
}
