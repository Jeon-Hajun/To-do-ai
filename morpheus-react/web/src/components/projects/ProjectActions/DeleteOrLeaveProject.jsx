import React from "react";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { deleteProject, leaveProject } from "../../../api/projects";

export default function DeleteOrLeaveProject({ projectId, mode }) {
  const navigate = useNavigate();

  const handleClick = async () => {
    const confirmMsg =
      mode === "delete"
        ? "정말 이 프로젝트를 삭제하시겠습니까?"
        : "정말 프로젝트에서 나가시겠습니까?";

    if (!window.confirm(confirmMsg)) return;

    try {
      if (!projectId) throw new Error("프로젝트 ID가 없습니다.");

      if (mode === "delete") {
        const res = await deleteProject(projectId);
        alert(res?.message || "프로젝트가 삭제되었습니다.");
      } else {
        const res = await leaveProject(projectId);
        alert(res?.message || "프로젝트에서 나갔습니다.");
      }

      navigate("/projects");
    } catch (err) {
      // 서버 에러 메시지 우선, 없으면 JS 에러 메시지
      const errorMsg =
        err.response?.data?.message || err.message || "알 수 없는 오류";
      alert(`${mode === "delete" ? "삭제" : "나가기"} 실패: ${errorMsg}`);
    }
  };

  return (
    <Button
      variant="outlined"
      color={mode === "delete" ? "error" : "warning"}
      sx={{ ml: 2 }}
      onClick={handleClick}
    >
      {mode === "delete" ? "삭제" : "나가기"}
    </Button>
  );
}
