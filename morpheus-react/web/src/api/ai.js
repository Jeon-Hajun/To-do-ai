// src/api/ai.js
import axios from "axios";
import { getToken } from "../utils/auth";
import { API_ENDPOINTS } from "../config/api";

const API_URL = API_ENDPOINTS.AI;

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
    // AI 백엔드 연결 실패 시 사용자 친화적 메시지
    if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
      return {
        success: false,
        error: {
          code: 'AI_BACKEND_UNAVAILABLE',
          message: 'AI 서비스에 연결할 수 없습니다. AI 백엔드가 실행 중인지 확인해주세요.'
        }
      };
    }
    
    return {
      success: false,
      error: err.response?.data?.error || { 
        code: err.response?.data?.error?.code || 'AI_REQUEST_FAILED',
        message: err.response?.data?.error?.message || err.message || 'AI 요청 처리 중 오류가 발생했습니다.' 
      },
    };
  }
};

// ================== AI API 함수 ==================

/**
 * Task 제안 받기
 * @param {number} projectId - 프로젝트 ID
 * @param {Object} options - 옵션
 * @param {boolean} options.includeCommits - 커밋 정보 포함 여부 (기본값: true)
 * @param {boolean} options.includeIssues - 이슈 정보 포함 여부 (기본값: true)
 * @returns {Promise<Object>} { success, data: { suggestions, analysis }, error }
 */
export const getTaskSuggestions = async (projectId, options = {}) => {
  if (!projectId) return { success: false, error: { message: "프로젝트 ID 필요" } };
  
  const { includeCommits = true, includeIssues = true } = options;
  
  return await callApi("post", `${API_URL}/task-suggestion`, {
    projectId,
    includeCommits,
    includeIssues,
  });
};

/**
 * 진행도 분석
 * @param {number} projectId - 프로젝트 ID
 * @returns {Promise<Object>} { success, data: { ...analysis data }, error }
 */
export const getProgressAnalysis = async (projectId) => {
  if (!projectId) return { success: false, error: { message: "프로젝트 ID 필요" } };
  
  return await callApi("post", `${API_URL}/progress-analysis`, {
    projectId,
  });
};

/**
 * Task 완료 여부 판단
 * @param {number} projectId - 프로젝트 ID
 * @param {number} taskId - Task ID
 * @returns {Promise<Object>} { success, data: { isCompleted, confidence, reasoning, suggestions }, error }
 */
export const checkTaskCompletion = async (projectId, taskId) => {
  if (!projectId) return { success: false, error: { message: "프로젝트 ID 필요" } };
  if (!taskId) return { success: false, error: { message: "Task ID 필요" } };
  
  return await callApi("post", `${API_URL}/task-completion-check`, {
    projectId,
    taskId,
  });
};

