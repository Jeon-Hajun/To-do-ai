// src/api/projects.js
import axios from "axios";
import { getToken } from "../utils/auth";
import { getAuthHeader } from "../utils/api";
import { API_ENDPOINTS } from "../config/api";

const API_URL = API_ENDPOINTS.PROJECT;

// 프로젝트 목록 조회
export const fetchProjects = async () => {
  const token = getToken();
  if (!token) throw new Error("토큰이 없습니다. 로그인해주세요.");

  const res = await axios.get(`${API_URL}/info`, {
    headers: { Authorization: `Bearer ${token}` },
    withCredentials: true
  });

  return res.data.data.projects || [];
};

// 프로젝트 상세 조회
export const fetchProjectById = async (projectId) => {
  if (!projectId) throw new Error("projectId가 필요합니다.");
  const res = await axios.get(`${API_URL}/info`, {
    params: { id: projectId },
    headers: getAuthHeader(),
    withCredentials: true,
  });
  return res.data.data.project;
};

// 프로젝트 멤버 조회
export const fetchProjectMembers = async (projectId) => {
  if (!projectId) throw new Error("projectId가 필요합니다.");
  const res = await axios.get(`${API_URL}/members`, {
    params: { projectId },
    headers: getAuthHeader(),
    withCredentials: true,
  });
  return res.data.data.members || [];
};

// 프로젝트 생성
export const createProject = async (data) => {
  const res = await axios.post(`${API_URL}/create`, data, {
    headers: getAuthHeader(),
    withCredentials: true,
  });
  return res.data;
};

// 프로젝트 수정
export const updateProject = async ({ projectId, update }) => {
  if (!projectId) throw new Error("projectId가 필요합니다.");
  const res = await axios.put(`${API_URL}/update`, { projectId, ...update }, {
    headers: getAuthHeader(),
    withCredentials: true,
  });
  return res.data;
};

// 프로젝트 삭제 (owner)
export const deleteProject = async (projectId) => {
  if (!projectId) throw new Error("projectId가 필요합니다.");
  const res = await axios.delete(`${API_URL}/delete`, {
    headers: getAuthHeader(),
    data: { projectId },
    withCredentials: true,
  });
  return res.data;
};

// 프로젝트 참여
export const joinProject = async ({ projectCode, password }) => {
  const res = await axios.post(`${API_URL}/join`, { projectCode, password }, {
    headers: getAuthHeader(),
    withCredentials: true,
  });
  return res.data;
};

// 프로젝트 탈퇴 (멤버용)
export const leaveProject = async (projectId) => {
  if (!projectId) throw new Error("projectId가 필요합니다.");
  const res = await axios.delete(`${API_URL}/leave`, {
    headers: getAuthHeader(),
    data: { projectId },
    withCredentials: true,
  });
  return res.data;
};

// 프로젝트 멤버 삭제 (owner)
export const removeProjectMember = async ({ projectId, userId }) => {
  if (!projectId || !userId) throw new Error("projectId와 userId가 필요합니다.");
  const res = await axios.delete(`${API_URL}/member`, {
    headers: getAuthHeader(),
    data: { projectId, userId },
    withCredentials: true,
  });
  return res.data;
};

/**
 * 프로젝트 코드 검증 / 조회
 * @param {string} projectCode 
 * @returns {isValid, exists, projectId?, title?}
 */
export const validateProjectCode = async (projectCode) => {
  if (!projectCode) throw new Error("projectCode가 필요합니다.");

  const res = await axios.get(`${API_URL}/validate-code`, {
    params: { projectCode },
    headers: getAuthHeader(),
    withCredentials: true
  });

  if (!res.data.success) {
    throw new Error(res.data.error?.message || "프로젝트 코드 검증 실패");
  }

  return res.data.data;
};

export const fetchProjectOwner = async (projectId) => {
  const { data } = await axios.get(`/api/projects/${projectId}/owner`);
  return data;
};

// AI 기반 프로젝트 생성
export const createProjectWithAI = async (naturalLanguageInput) => {
  const res = await axios.post(`${API_URL}/create-with-ai`, 
    { naturalLanguageInput },
    {
      headers: getAuthHeader(),
      withCredentials: true,
    }
  );
  return res.data;
};