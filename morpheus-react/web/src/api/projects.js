import axios from "axios";
import { getToken } from "../utils/auth";
import { API_ENDPOINTS } from "../config/api";

const API_URL = API_ENDPOINTS.PROJECT;

// 인증 헤더 가져오기
const getAuthHeaders = () => {
  const token = getToken();
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
};

// 공통 API 호출 함수
const callApi = async (method, url, data = null) => {
  const headers = getAuthHeaders();
  if (!headers) return { success: false, error: { message: "로그인 필요" } };

  try {
    const config = { method, url, headers, withCredentials: true };

    if (method.toLowerCase() === "delete" && data) {
      config.data = data;
    } else if (data && method.toLowerCase() !== "get") {
      config.data = data;
    }

    const res = await axios(config);
    return res.data || { success: false, error: { message: "서버 응답 없음" } };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || { message: err.message || "알 수 없는 오류" },
    };
  }
};

// ================= 프로젝트 API 함수 =================
export const getProjects = async (projectId) => {
  const res = await callApi("get", projectId ? `${API_URL}/info?id=${projectId}` : `${API_URL}/info`);

  if (res.success && res.data) {
    // 목록 조회일 경우 description 없으면 "설명이 없습니다." 처리
    if (res.data.projects) {
      res.data.projects = res.data.projects.map(p => ({
        ...p,
        description: p.description ?? "설명이 없습니다."
      }));
    } else if (res.data.project) {
      // 상세 조회일 경우도 description 없으면 처리
      res.data.project.description = res.data.project.description ?? "설명이 없습니다.";
      res.data.project.hasGithubToken = res.data.project.hasGithubToken || false;
    }
  }

  return res;
};

export const createProject = async ({ title, description, isShared, password, githubRepo }) => {
  return await callApi("post", `${API_URL}/create`, {
    title,
    description,
    isShared,
    password,
    githubRepo,
  });
};

export const updateProject = async (projectId, data) => {
  return await callApi("put", `${API_URL}/update`, { projectId, ...data });
};

export const deleteProject = async (projectId) => {
  return await callApi("delete", `${API_URL}/delete`, { projectId });
};

export const joinProject = async (projectCode, password) => {
  return await callApi("post", `${API_URL}/join`, { projectCode, password });
};

export const leaveProject = async (projectId) => {
  return await axios.delete(`${API_URL}/leave`, {
    headers: getAuthHeaders(),
    withCredentials: true,
    data: { projectId },
  }).then(res => res.data)
    .catch(err => ({
      success: false,
      error: err.response?.data?.error || { message: err.message || "알 수 없는 오류" },
    }));
};

// 특정 프로젝트 멤버 조회
export const getMembers = async (projectId) => {
  return await callApi("get", `${API_URL}/members?projectId=${projectId}`);
};

// === 새롭게 추가된 named export ===
// ProjectTaskList.jsx에서 사용하기 위한 getProjectMembers
export const getProjectMembers = getMembers;

export const deleteMember = async (projectId, memberId) => {
  return await callApi("delete", `${API_URL}/member`, { projectId, memberId });
};

export const validateProjectCode = async (projectCode) => {
  return await callApi("get", `${API_URL}/validate-code?projectCode=${projectCode}`);
};

export const connectGithubRepo = async (projectId, githubRepo, githubToken = null) => {
  return await callApi("post", `${API_URL}/connect-github`, { projectId, githubRepo, githubToken });
};
