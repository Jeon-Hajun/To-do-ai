// src/api/task.js
import axios from "axios";
import { getToken } from "../utils/auth";

const API_URL = "http://localhost:5000/api/task";

// 인증 헤더
const getAuthHeaders = () => {
  const token = getToken();
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
};

// 공통 API 호출
const callApi = async (method, url, data = null) => {
  const headers = getAuthHeaders();
  if (!headers) return { success: false, error: { message: "로그인 필요" } };

  try {
    const config = { method, url, headers, withCredentials: true };
    if (method.toLowerCase() === "delete" && data) config.data = data;
    else if (data && method.toLowerCase() !== "get") config.data = data;

    const res = await axios(config);
    return res.data || { success: false, error: { message: "서버 응답 없음" } };
  } catch (err) {
    console.error("API 호출 실패:", err.response?.data || err.message);
    return {
      success: false,
      error: err.response?.data?.error || { message: err.message || "알 수 없는 오류" },
    };
  }
};

// ================== Task API ==================

// 특정 프로젝트의 Task 리스트 조회
export const getTasksByProject = async (projectId) => {
  if (!projectId) return { success: false, error: { message: "프로젝트 ID 필요" } };
  return await callApi("get", `${API_URL}/info?projectId=${projectId}`);
};

// Task 생성
export const createTask = async (projectId, { title, description, assignedUserId, dueDate }) => {
  if (!projectId) return { success: false, error: { message: "프로젝트 ID 필요" } };
  return await callApi("post", `${API_URL}/create`, { projectId, title, description, assignedUserId, dueDate });
};

// Task 수정 (제목, 설명, 마감일)
export const updateTask = async (id, data) => {
  if (!id) return { success: false, error: { message: "Task ID 필요" } };
  return await callApi("patch", `${API_URL}/update`, { id, ...data });
};

// Task 상태 수정
export const updateTaskStatus = async (id, status) => {
  if (!id) return { success: false, error: { message: "Task ID 필요" } };
  return await callApi("patch", `${API_URL}/status`, { id, status });
};

// Task 할당
export const assignTask = async (id, assignedUserId) => {
  if (!id) return { success: false, error: { message: "Task ID 필요" } };
  return await callApi("patch", `${API_URL}/assign`, { id, assignedUserId });
};

// Task 삭제
export const deleteTask = async (id) => {
  if (!id) return { success: false, error: { message: "Task ID 필요" } };
  return await callApi("delete", `${API_URL}/delete`, { id });
};
