// src/components/Project/ProjectManager.jsx
import React, { useEffect, useReducer } from "react";
import CreateProject from "./CreateProject";
import JoinProject from "./JoinProject";
import UpdateProject from "./UpdateProject";
import ProjectCard from "./ProjectCard";
import Button from "../ui/Button";
import { getProjects, leaveProject, deleteProject } from "../../api/projects";
import { getUser } from "../../utils/auth";
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";

const initialState = {
  projects: [],
  loading: false,
  error: "",
  modalOpen: false,
  modalType: "",
  updateTarget: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: "" };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, projects: action.payload };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "OPEN_MODAL":
      return {
        ...state,
        modalOpen: true,
        modalType: action.payload.type,
        updateTarget: action.payload.target || null,
      };
    case "CLOSE_MODAL":
      return { ...state, modalOpen: false, modalType: "", updateTarget: null };
    case "REMOVE_PROJECT":
      return { ...state, projects: state.projects.filter((p) => p.id !== action.payload) };
    default:
      return state;
  }
}

export default function ProjectManager() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const currentUser = getUser();

  const fetchProjects = async () => {
    dispatch({ type: "FETCH_START" });
    try {
      const res = await getProjects();
      if (res.success && Array.isArray(res.data.projects)) {
        const projectsWithOwnerId = res.data.projects.map((p) => ({
          ...p,
          ownerId: p.ownerId ?? p.owner_id ?? null,
        }));
        dispatch({ type: "FETCH_SUCCESS", payload: projectsWithOwnerId });
      } else {
        dispatch({ type: "FETCH_ERROR", payload: "프로젝트를 불러오지 못했습니다." });
      }
    } catch {
      dispatch({ type: "FETCH_ERROR", payload: "서버 요청 중 오류가 발생했습니다." });
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleModalClose = () => dispatch({ type: "CLOSE_MODAL" });

  const handleCreateSuccess = async () => {
    await fetchProjects();
    handleModalClose();
  };

  const handleJoinSuccess = async () => {
    await fetchProjects();
    handleModalClose();
  };

  const handleUpdateSuccess = async () => {
    await fetchProjects();
    handleModalClose();
  };

  const handleLeave = async (projectId) => {
    if (!window.confirm("정말 프로젝트에서 나가시겠습니까?")) return;
    try {
      const res = await leaveProject(projectId);
      if (res.success) {
        dispatch({ type: "REMOVE_PROJECT", payload: projectId });
      } else {
        alert("프로젝트 나가기 실패: " + (res.error?.message || "알 수 없는 오류"));
      }
    } catch {
      alert("프로젝트 나가기 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm("정말 프로젝트를 삭제하시겠습니까?")) return;
    try {
      const res = await deleteProject(projectId);
      if (res.success) {
        dispatch({ type: "REMOVE_PROJECT", payload: projectId });
      } else {
        alert("프로젝트 삭제 실패: " + (res.error?.message || "알 수 없는 오류"));
      }
    } catch {
      alert("프로젝트 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleUpdate = (project) =>
    dispatch({ type: "OPEN_MODAL", payload: { type: "update", target: project } });

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <Button onClick={() => dispatch({ type: "OPEN_MODAL", payload: { type: "create" } })}>
          프로젝트 생성
        </Button>
        <Button onClick={() => dispatch({ type: "OPEN_MODAL", payload: { type: "join" } })}>
          프로젝트 참여
        </Button>
        <IconButton onClick={fetchProjects} color="primary" title="새로고침">
          <RefreshIcon />
        </IconButton>
      </div>

      {state.loading && <div>로딩 중...</div>}
      {!state.loading && state.error && <div style={{ color: "red" }}>{state.error}</div>}
      {!state.loading && !state.error && state.projects.length === 0 && (
        <div>참여한 프로젝트가 없습니다.</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
        {state.projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            currentUser={currentUser}
            onLeave={handleLeave}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        ))}
      </div>

      <Dialog open={state.modalOpen} onClose={handleModalClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {state.modalType === "create" && "프로젝트 생성"}
          {state.modalType === "join" && "프로젝트 참여"}
          {state.modalType === "update" && "프로젝트 수정"}
        </DialogTitle>
        <DialogContent dividers>
          {state.modalType === "create" && (
            <CreateProject onCreateSuccess={handleCreateSuccess} onClose={handleModalClose} />
          )}
          {state.modalType === "join" && (
            <JoinProject onJoinSuccess={handleJoinSuccess} onClose={handleModalClose} />
          )}
          {state.modalType === "update" && (
            <UpdateProject project={state.updateTarget} onUpdateSuccess={handleUpdateSuccess} onClose={handleModalClose} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
