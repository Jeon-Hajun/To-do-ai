// src/api/ai.js
import axios from "axios";
import { getAuthHeader } from "../utils/api";
import { API_ENDPOINTS } from "../config/api";

const API_URL = API_ENDPOINTS.AI;

// 공통 API 호출 함수
const callApi = async (method, url, data = null) => {
  console.log('[AI API] 요청 시작:', { method, url, data });
  
  let headers;
  try {
    headers = getAuthHeader();
  } catch (err) {
    console.error('[AI API] 인증 헤더 생성 실패:', err.message);
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

/**
 * 챗봇 메시지 전송
 * @param {number} projectId - 프로젝트 ID
 * @param {string} message - 사용자 메시지
 * @param {Array} conversationHistory - 대화 히스토리 (선택사항)
 * @returns {Promise<Object>} { success, data: { conversationId, agentType, message, response }, error }
 */
export const sendChatMessage = async (projectId, message, conversationHistory = []) => {
  console.log('[AI API] sendChatMessage 호출:', { projectId, messageLength: message.length });
  
  if (!projectId) {
    console.error('[AI API] sendChatMessage - projectId 없음');
    return { success: false, error: { message: "프로젝트 ID 필요" } };
  }
  if (!message || !message.trim()) {
    console.error('[AI API] sendChatMessage - message 없음');
    return { success: false, error: { message: "메시지 필요" } };
  }
  
  const result = await callApi("post", `${API_URL}/chat`, {
    projectId,
    message: message.trim(),
    conversationHistory
  });
  
  console.log('[AI API] sendChatMessage 결과:', { success: result.success, hasData: !!result.data });
  return result;
};

/**
 * 대화 히스토리 조회
 * @param {number} projectId - 프로젝트 ID
 * @returns {Promise<Object>} { success, data: { conversationId, messages }, error }
 */
export const getChatHistory = async (projectId) => {
  console.log('[AI API] getChatHistory 호출:', { projectId });
  
  if (!projectId) {
    console.error('[AI API] getChatHistory - projectId 없음');
    return { success: false, error: { message: "프로젝트 ID 필요" } };
  }
  
  const result = await callApi("get", `${API_URL}/chat/history/${projectId}`);
  
  console.log('[AI API] getChatHistory 결과:', { success: result.success, hasData: !!result.data });
  return result;
};

/**
 * 대화 세션 초기화 (컨텍스트 초기화)
 * @param {number} conversationId - 대화 세션 ID
 * @returns {Promise<Object>} { success, message, error }
 */
export const clearConversation = async (conversationId) => {
  console.log('[AI API] clearConversation 호출:', { conversationId });
  
  if (!conversationId) {
    console.error('[AI API] clearConversation - conversationId 없음');
    return { success: false, error: { message: "대화 세션 ID 필요" } };
  }
  
  const result = await callApi("delete", `${API_URL}/chat/conversation/${conversationId}`);
  
  console.log('[AI API] clearConversation 결과:', { success: result.success });
  return result;
};

/**
 * Task 할당 추천 받기
 * @param {number} projectId - 프로젝트 ID
 * @param {number} taskId - Task ID (선택사항, 없으면 미할당 Task 중 자동 선택)
 * @returns {Promise<Object>} { success, data: { recommendedUserId, reason, confidence, message }, error }
 */
export const getTaskAssignmentRecommendation = async (projectId, taskId = null) => {
  console.log('[AI API] getTaskAssignmentRecommendation 호출:', { projectId, taskId });
  
  if (!projectId) {
    console.error('[AI API] getTaskAssignmentRecommendation - projectId 없음');
    return { success: false, error: { message: "프로젝트 ID 필요" } };
  }
  
  // taskId가 있으면 명시적으로 전달, 없으면 "task 할당해줘" 메시지로 미할당 Task 자동 선택
  const message = taskId 
    ? `Task ${taskId}를 할당해줘`
    : "미할당 task 알아서 할당해줘";
  
  const result = await callApi("post", `${API_URL}/chat`, {
    projectId,
    message,
    taskId: taskId || undefined,  // 명시적 taskId 전달
    conversationHistory: []
  });
  
  console.log('[AI API] getTaskAssignmentRecommendation 결과:', { 
    success: result.success, 
    hasData: !!result.data,
    agentType: result.data?.agent_type,
    hasError: !!result.error
  });
  
  // 응답 형식 변환 (chat 응답을 할당 추천 응답 형식으로)
  if (result.success && result.data?.response?.type === 'task_assignment') {
    return {
      success: true,
      data: {
        recommendedUserId: result.data.response.recommendedUserId,
        reason: result.data.response.reason,
        confidence: result.data.response.confidence || result.data.confidence || 'medium',
        message: result.data.response.message || result.data.message,
        taskTitle: result.data.response.taskTitle,
        alternativeUsers: result.data.response.alternativeUsers || [],
        requiredSkills: result.data.response.requiredSkills || [],
        matchScore: result.data.response.matchScore
      }
    };
  }
  
  return result;
};

