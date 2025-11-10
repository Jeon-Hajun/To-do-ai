import React, { useEffect, useReducer } from "react";
import CustomModal from "../ui/Modal";
import CreateProject from "./CreateProject";
import JoinProject from "./JoinProject";
import ProjectCard from "./ProjectCard";
import Button from "../ui/Button";
import { getProjects, leaveProject, deleteProject } from "../../api/projects";
import { getUser } from "../../utils/auth";

const initialState = {
  projects: [],
  loading: false,
  error: "",
  modalOpen: false,
  modalType: "", // create | join | update
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
      return { ...state, modalOpen: true, modalType: action.payload.type, updateTarget: action.payload.target || null };
    case "CLOSE_MODAL":
      return { ...state, modalOpen: false, modalType: "", updateTarget: null };
    case "ADD_PROJECT":
      return { ...state, projects: [action.payload, ...state.projects] };
    case "UPDATE_PROJECT":
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.id ? { ...p, ...action.payload.data } : p)
      };
    case "REMOVE_PROJECT":
      return { ...state, projects: state.projects.filter(p => p.id !== action.payload) };
    default:
      return state;
  }
}

export default function ProjectManager() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const currentUser = getUser();

  // 프로젝트 불러오기
  const fetchProjects = async () => {
    dispatch({ type: "FETCH_START" });
    try {
      const res = await getProjects();
      if (res.success && Array.isArray(res.data.projects)) {
        dispatch({ type: "FETCH_SUCCESS", payload: res.data.projects });
      } else {
        dispatch({ type: "FETCH_ERROR", payload: "프로젝트를 불러오지 못했습니다." });
      }
    } catch (err) {
      dispatch({ type: "FETCH_ERROR", payload: "서버 요청 중 오류가 발생했습니다." });
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  // 모달 성공 (생성/참여/업데이트)
  const handleModalSuccess = (project) => {
    if (!project) return;
    if (state.modalType === "update") {
      dispatch({ type: "UPDATE_PROJECT", payload: { id: state.updateTarget.id, data: project } });
    } else {
      dispatch({ type: "ADD_PROJECT", payload: project });
    }
    dispatch({ type: "CLOSE_MODAL" });
  };

  // 프로젝트 나가기
  const handleLeave = async (projectId) => {
    if (!window.confirm("정말 프로젝트에서 나가시겠습니까?")) return;
    try {
      const res = await leaveProject(projectId);
      if (res.success) {
        dispatch({ type: "REMOVE_PROJECT", payload: projectId });
      } else {
        alert("프로젝트 나가기 실패: " + (res.error?.message || "알 수 없는 오류"));
      }
    } catch (err) {
      alert("프로젝트 나가기 중 오류가 발생했습니다.");
    }
  };

  // 프로젝트 삭제
  const handleDelete = async (projectId) => {
    if (!window.confirm("정말 프로젝트를 삭제하시겠습니까?")) return;
    try {
      const res = await deleteProject(projectId);
      if (res.success) {
        dispatch({ type: "REMOVE_PROJECT", payload: projectId });
      } else {
        alert("프로젝트 삭제 실패: " + (res.error?.message || "알 수 없는 오류"));
      }
    } catch (err) {
      alert("프로젝트 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleUpdate = (project) => dispatch({ type: "OPEN_MODAL", payload: { type: "update", target: project } });

  return (
    <div className="p-4">
      <div className="flex gap-3 mb-4">
        <Button onClick={() => dispatch({ type: "OPEN_MODAL", payload: { type: "create" } })}>프로젝트 생성</Button>
        <Button onClick={() => dispatch({ type: "OPEN_MODAL", payload: { type: "join" } })}>프로젝트 참여</Button>
      </div>

      {state.loading && <div>로딩 중...</div>}
      {!state.loading && state.error && <div className="text-red-500">{state.error}</div>}
      {!state.loading && !state.error && state.projects.length === 0 && <div>참여한 프로젝트가 없습니다.</div>}

      {!state.loading && !state.error && state.projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          currentUser={currentUser}
          onLeave={handleLeave}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      ))}

      <CustomModal isOpen={state.modalOpen} onClose={() => dispatch({ type: "CLOSE_MODAL" })}>
        {state.modalType === "create" && <CreateProject onCreateSuccess={handleModalSuccess} />}
        {state.modalType === "join" && <JoinProject onJoin={handleModalSuccess} />}
        {state.modalType === "update" && <CreateProject project={state.updateTarget} onCreateSuccess={handleModalSuccess} />}
      </CustomModal>
    </div>
  );
}
