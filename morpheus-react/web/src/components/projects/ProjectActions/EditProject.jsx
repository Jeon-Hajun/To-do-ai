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
            minRows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예시 형식:&#10;&#10;## 프로젝트 목적&#10;이 프로젝트의 목표와 배경을 설명해주세요.&#10;&#10;## 주요 기능&#10;- 기능 1&#10;- 기능 2&#10;&#10;## 기술 스택&#10;사용할 기술들을 나열해주세요.&#10;&#10;## 기간/일정&#10;프로젝트 기간과 주요 마일스톤을 작성해주세요."
            helperText="마크다운 형식을 사용할 수 있습니다. 제목(#), 리스트(-), 코드(`) 등을 활용해보세요."
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
