import React, { useState, useEffect } from "react";
import { Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from "@mui/material";
import { updateProject } from "../../../api/projects";

export default function EditProject({ project }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(project?.title || "");
  const [description, setDescription] = useState(project?.description || "");

  // project가 변경될 때 상태 업데이트
  useEffect(() => {
    if (project) {
      setTitle(project.title || "");
      setDescription(project.description || "");
    }
  }, [project]);

  const handleSave = async () => {
    if (!project || !project.id) {
      alert("프로젝트 정보가 없습니다.");
      return;
    }
    try {
      await updateProject({
        projectId: project.id,
        update: {
          title,
          description,
        },
      });
      alert("프로젝트가 수정되었습니다!");
      setOpen(false);
      window.location.reload(); // or refetch
    } catch (err) {
      console.error("프로젝트 수정 오류:", err);
      const errorMessage = err.response?.data?.error?.message || err.message || "알 수 없는 오류";
      alert("수정 실패: " + errorMessage);
    }
  };

  return (
    <>
      <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
        수정
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>프로젝트 수정</DialogTitle>
        <DialogContent>
          <TextField
            label="프로젝트 제목"
            fullWidth
            margin="dense"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="프로젝트 설명"
            fullWidth
            margin="dense"
            multiline
            minRows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
