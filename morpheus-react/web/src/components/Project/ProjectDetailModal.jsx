import React from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";

export default function ProjectDetailModal({ project, onClose }) {
  if (!project) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card title={project.name} sx={{ width: 600, maxHeight: "90vh", overflowY: "auto" }}>
        <Typography variant="body2" color="textSecondary">코드: {project.code}</Typography>

        <div style={{ marginTop: 16 }}>
          <Typography variant="subtitle1">참가자</Typography>
          <Stack direction="row" spacing={1} mt={1}>
            {project.participants.map((p) => (
              <Stack key={p.id} alignItems="center">
                <Avatar src={p.avatar} sx={{ width: 40, height: 40 }} />
                <Typography variant="caption">{p.name}</Typography>
              </Stack>
            ))}
          </Stack>
        </div>

        <div style={{ marginTop: 16 }}>
          <Typography variant="subtitle1">테스크</Typography>
          {project.tasks?.length ? (
            <ul>
              {project.tasks.map((t) => (
                <li key={t.id}>{t.title} - {t.status}</li>
              ))}
            </ul>
          ) : (
            <Typography variant="body2" color="textSecondary">등록된 테스크가 없습니다.</Typography>
          )}
        </div>

        <Stack direction="row" justifyContent="flex-end" mt={2}>
          <Button type="default" onClick={onClose}>닫기</Button>
        </Stack>
      </Card>
    </div>
  );
}
