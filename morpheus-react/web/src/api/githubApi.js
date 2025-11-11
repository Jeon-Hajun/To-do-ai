import axios from "axios";
import { getToken } from "../utils/auth";

const API_URL = "http://localhost:5000/api/github";

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

// ================= GitHub API 함수 =================

// 커밋 목록 조회
export const getCommits = async (projectId) => {
  return await callApi("get", `${API_URL}/commits/${projectId}`);
};

// 커밋 상세 조회
export const getCommit = async (projectId, commitSha) => {
  return await callApi("get", `${API_URL}/commits/${projectId}/${commitSha}`);
};

// 이슈 목록 조회
export const getIssues = async (projectId, options = {}) => {
  const { state, limit, offset } = options;
  let url = `${API_URL}/issues/${projectId}`;
  const params = [];
  if (state) params.push(`state=${state}`);
  if (limit) params.push(`limit=${limit}`);
  if (offset) params.push(`offset=${offset}`);
  if (params.length > 0) url += `?${params.join("&")}`;
  return await callApi("get", url);
};

// 이슈 상세 조회
export const getIssue = async (projectId, issueNumber) => {
  return await callApi("get", `${API_URL}/issues/${projectId}/${issueNumber}`);
};

// 브랜치 목록 조회
export const getBranches = async (projectId) => {
  return await callApi("get", `${API_URL}/branches/${projectId}`);
};

// 브랜치 상세 조회
export const getBranch = async (projectId, branchName) => {
  return await callApi("get", `${API_URL}/branches/${projectId}/${branchName}`);
};

// GitHub 동기화
export const syncGitHub = async (projectId) => {
  return await callApi("post", `${API_URL}/sync/${projectId}`);
};

