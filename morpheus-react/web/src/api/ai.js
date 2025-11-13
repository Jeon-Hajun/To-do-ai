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
  console.log('[AI API] 요청 시작:', { method, url, data });
  
  const headers = getAuthHeaders();
  if (!headers) {
    console.error('[AI API] 인증 헤더 없음 - 로그인 필요');
    return { success: false, error: { message: "로그인 필요" } };
  }

  try {
    const config = { method, url, headers, withCredentials: true };

    if (method.toLowerCase() === "delete" && data) {
      config.data = data;
    } else if (data && method.toLowerCase() !== "get") {
      config.data = data;
    }

    console.log('[AI API] 요청 전송:', { url, method, hasData: !!data });
    const res = await axios(config);
    console.log('[AI API] 응답 수신:', { status: res.status, success: res.data?.success, hasData: !!res.data?.data });
    
    return res.data || { success: false, error: { message: "서버 응답 없음" } };
  } catch (err) {
    console.error('[AI API] 요청 실패:', {
      code: err.code,
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      url: err.config?.url
    });
    
    // AI 백엔드 연결 실패 시 사용자 친화적 메시지
    if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
      console.error('[AI API] 연결 실패 - AI 백엔드가 실행 중인지 확인 필요');
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
  console.log('[AI API] getTaskSuggestions 호출:', { projectId, options });
  
  if (!projectId) {
    console.error('[AI API] getTaskSuggestions - projectId 없음');
    return { success: false, error: { message: "프로젝트 ID 필요" } };
  }
  
  const { includeCommits = true, includeIssues = true } = options;
  
  const result = await callApi("post", `${API_URL}/task-suggestion`, {
    projectId,
    includeCommits,
    includeIssues,
  });
  
  console.log('[AI API] getTaskSuggestions 결과:', { success: result.success, hasSuggestions: !!result.data?.suggestions });
  return result;
};

/**
 * 진행도 분석
 * @param {number} projectId - 프로젝트 ID
 * @returns {Promise<Object>} { success, data: { ...analysis data }, error }
 */
export const getProgressAnalysis = async (projectId) => {
  console.log('[AI API] getProgressAnalysis 호출:', { projectId });
  
  if (!projectId) {
    console.error('[AI API] getProgressAnalysis - projectId 없음');
    return { success: false, error: { message: "프로젝트 ID 필요" } };
  }
  
  const result = await callApi("post", `${API_URL}/progress-analysis`, {
    projectId,
  });
  
  console.log('[AI API] getProgressAnalysis 결과:', { success: result.success, hasData: !!result.data });
  return result;
};

/**
 * Task 완료 여부 판단
 * @param {number} projectId - 프로젝트 ID
 * @param {number} taskId - Task ID
 * @returns {Promise<Object>} { success, data: { isCompleted, confidence, reasoning, suggestions }, error }
 */
export const checkTaskCompletion = async (projectId, taskId) => {
  console.log('[AI API] checkTaskCompletion 호출:', { projectId, taskId });
  
  if (!projectId) {
    console.error('[AI API] checkTaskCompletion - projectId 없음');
    return { success: false, error: { message: "프로젝트 ID 필요" } };
  }
  if (!taskId) {
    console.error('[AI API] checkTaskCompletion - taskId 없음');
    return { success: false, error: { message: "Task ID 필요" } };
  }
  
  const result = await callApi("post", `${API_URL}/task-completion-check`, {
    projectId,
    taskId,
  });
  
  console.log('[AI API] checkTaskCompletion 결과:', { success: result.success, hasData: !!result.data });
  return result;
};

