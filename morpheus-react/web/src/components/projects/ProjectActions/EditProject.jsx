import React, { useState, useEffect } from "react";
import { Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Tabs, Tab, Paper, Box, Checkbox, FormControlLabel } from "@mui/material";
import { updateProject } from "../../../api/projects";
import MarkdownRenderer from "../../common/MarkdownRenderer";

export default function EditProject({ project }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(project?.title || "");
  const [description, setDescription] = useState(project?.description || "");
  const [isShared, setIsShared] = useState(project?.isShared || false);
  const [password, setPassword] = useState("");
  const [descriptionTab, setDescriptionTab] = useState(0); // 0: 작성, 1: 미리보기

  // project가 변경될 때 상태 업데이트
  useEffect(() => {
    if (project) {
      setTitle(project.title || "");
      setDescription(project.description || "");
      setIsShared(Boolean(project.isShared));
      setPassword(""); // 비밀번호는 보안상 초기화
    }
  }, [project]);

  // 다이얼로그가 열릴 때 탭 초기화
  useEffect(() => {
    if (open) {
      setDescriptionTab(0);
    }
  }, [open]);

  const handleSave = async () => {
    if (!project || !project.id) {
      alert("프로젝트 정보가 없습니다.");
      return;
    }
    try {
      const updateData = {
        title,
        description,
        isShared,
      };
      
      // 공유 프로젝트이고 비밀번호가 입력된 경우에만 비밀번호 업데이트
      if (isShared && password) {
        updateData.password = password;
      }
      
      await updateProject({
        projectId: project.id,
        update: updateData,
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
          
          <FormControlLabel
            control={
              <Checkbox
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
              />
            }
            label="공유 프로젝트"
            sx={{ mt: 1 }}
          />
          
          {isShared && (
            <TextField
              label="비밀번호 (공유 프로젝트용)"
              type="password"
              fullWidth
              margin="dense"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 변경하려면 입력하세요"
              helperText="비밀번호를 변경하지 않으려면 비워두세요"
            />
          )}
          
          <Box sx={{ mt: 1 }}>
            <Tabs 
              value={descriptionTab} 
              onChange={(e, newValue) => setDescriptionTab(newValue)}
              sx={{ mb: 1 }}
            >
              <Tab label="작성" />
              <Tab label="미리보기" />
            </Tabs>
            
            {descriptionTab === 0 ? (
          <TextField
            label="프로젝트 설명"
            fullWidth
            margin="dense"
            multiline
                minRows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
                placeholder={`## 프로젝트 목적
이 프로젝트의 목표와 배경을 설명해주세요.

## 주요 기능
- 기능 1
- 기능 2
- 기능 3

## 기술 스택
- **프론트엔드**: React, TypeScript
- **백엔드**: Node.js, Express
- **데이터베이스**: MySQL

## 기간/일정
- 시작일: 2024년 1월
- 마감일: 2024년 3월
- 주요 마일스톤: 설계 완료, MVP 개발, 테스트`}
                helperText="마크다운 형식을 사용할 수 있습니다. 제목(#), 리스트(-), 굵게(**텍스트**), 코드(`코드`) 등을 활용해보세요."
              />
            ) : (
              <Paper 
                sx={{ 
                  p: 2, 
                  minHeight: 200, 
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  mt: 1
                }}
              >
                {description ? (
                  <MarkdownRenderer content={description} />
                ) : (
                  <Box sx={{ color: "text.secondary", fontStyle: "italic", textAlign: "center", py: 4 }}>
                    작성한 내용이 여기에 표시됩니다.
                  </Box>
                )}
              </Paper>
            )}
          </Box>
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
