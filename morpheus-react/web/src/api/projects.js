import axios from "axios";
import { getToken } from "../utils/auth";

const API_URL = "http://localhost:5000/api/project";

// 공통: 인증 헤더 가져오기 (token 직접 사용)
const getAuthHeaders = () => {
  const token = getToken();
  if (!token) return null; // 로그인 안 됨
  return { Authorization: `Bearer ${token}` };
};

// 공통: API 호출
const callApi = async (method, url, data = null) => {
  const headers = getAuthHeaders();
  if (!headers) return { success: false, error: "로그인 필요" };

  try {
    const res = await axios({
      method,
      url,
      headers,
      data,
      withCredentials: true,
    });

    if (!res.data) {
      console.error("서버 응답이 없습니다.", res);
      return { success: false, error: "서버 응답 없음" };
    }

    return res.data;
  } catch (err) {
    console.error(`API ${method.toUpperCase()} ${url} 실패:`, err);
    return {
      success: false,
      error: err.response?.data?.error || err.message || "알 수 없는 오류",
    };
  }
};

// ==================== API 함수 ====================

// 프로젝트 목록 조회
export const getProjects = async () => {
  return await callApi("get", `${API_URL}/info`);
};

// 프로젝트 나가기
export const leaveProject = async (projectId) => {
  return await callApi("delete", `${API_URL}/leave`, { projectId });
};

// 프로젝트 삭제
export const deleteProject = async (projectId) => {
  return await callApi("delete", `${API_URL}/delete`, { projectId });
};

// 프로젝트 수정
export const updateProject = async (projectId, data) => {
  return await callApi("put", `${API_URL}/update`, { projectId, ...data });
};

// 프로젝트 참여
export const joinProject = async (projectCode, password) => {
  return await callApi("post", `${API_URL}/join`, { projectCode, password });
};
