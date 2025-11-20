// src/api/tasks.js
import axios from "axios";
import { getAuthHeader } from "../utils/api";
import { API_ENDPOINTS } from "../config/api";

const API_URL = API_ENDPOINTS.TASK;

// 프로젝트별 Task 목록 조회
export const fetchTasksByProject = async (projectId) => {
  if (!projectId) throw new Error("projectId가 필요합니다.");
  const res = await axios.get(`${API_URL}/info`, {
    params: { projectId },
    headers: getAuthHeader(),
    withCredentials: true,
  });
  
  // 응답 구조 확인 및 안전한 처리
  if (!res.data) {
    console.error('[API] fetchTasksByProject - 응답 데이터 없음:', res);
    return [];
  }
  
  if (!res.data.success) {
    console.error('[API] fetchTasksByProject - API 실패:', res.data);
    throw new Error(res.data.error?.message || 'Task 목록 조회에 실패했습니다.');
  }
  
  // 다양한 응답 형식 지원
  const tasks = res.data.data?.tasks || res.data.tasks || res.data.data || [];
  
  if (!Array.isArray(tasks)) {
    console.error('[API] fetchTasksByProject - tasks가 배열이 아님:', tasks);
    return [];
  }
  
  return tasks;
};

// Task 상세 조회
export const fetchTaskDetail = async (taskId) => {
  if (!taskId) throw new Error("taskId가 필요합니다.");
  const res = await axios.get(`${API_URL}/info`, {
    params: { id: taskId },
    headers: getAuthHeader(),
    withCredentials: true,
  });
  return res.data.data.task;
};

export const createTask = async ({ projectId, title, description, dueDate, assignedUserId }) => {
  if (!projectId || !title) throw new Error("projectId와 title이 필요합니다.");
  const res = await axios.post(
    `${API_URL}/create`,
    { projectId, title, description, dueDate, assignedUserId },
    { headers: getAuthHeader(), withCredentials: true }
  );
  return res.data.data;
};

// ✅ Task 수정
export const updateTask = async (taskId, updatedFields) => {
  if (!taskId) throw new Error("taskId가 필요합니다.");
  const res = await axios.patch(
    `${API_URL}/update`,
    { id: taskId, ...updatedFields },
    { headers: getAuthHeader(), withCredentials: true }
  );
  return res.data.data;
};

// ✅ Task 삭제
export const deleteTask = async (taskId) => {
  if (!taskId) throw new Error("taskId가 필요합니다.");
  const res = await axios.delete(`${API_URL}/delete`, {
    params: { id: taskId },
    headers: getAuthHeader(),
    withCredentials: true,
  });
  return res.data.data;
};

// Task 담당자 변경
export const assignTask = async (taskId, assignedUserId) => {
  if (!taskId) throw new Error("taskId가 필요합니다.");
  const res = await axios.patch(
    `${API_URL}/assign`,
    { id: taskId, assignedUserId },
    { headers: getAuthHeader(), withCredentials: true }
  );
  return res.data;
};

// Task 상태 변경 (담당자 또는 프로젝트 멤버)
export const updateTaskStatus = async ({ id, status }) => {
  if (!id || !status) throw new Error("id와 status가 필요합니다.");
  const res = await axios.patch(
    `${API_URL}/status`,
    { id, status },
    { headers: getAuthHeader(), withCredentials: true }
  );
  return res.data;
};