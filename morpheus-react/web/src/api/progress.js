// src/api/progress.js
import axios from "axios";
import { getAuthHeader } from "../utils/api";
import { API_BASE_URL } from "../config/api";

const API_URL = `${API_BASE_URL}/progress`;

/**
 * 프로젝트 진행도 조회
 * @param {number} projectId - 프로젝트 ID
 * @returns {Promise<Object>} { success, data: { taskProgress, taskStats, codeProgress, codeStats, contributions }, error }
 */
export const getProjectProgress = async (projectId) => {
  console.log('[Progress API] getProjectProgress 호출:', { projectId });
  
  if (!projectId) {
    console.error('[Progress API] getProjectProgress - projectId 없음');
    return { success: false, error: { message: "프로젝트 ID 필요" } };
  }
  
  try {
    const res = await axios.get(`${API_URL}/project/${projectId}`, {
      headers: getAuthHeader(),
      withCredentials: true,
    });
    
    console.log('[Progress API] getProjectProgress 결과:', { success: res.data?.success, hasData: !!res.data?.data });
    return res.data || { success: false, error: { message: "서버 응답 없음" } };
  } catch (err) {
    console.error('[Progress API] getProjectProgress 오류:', {
      code: err.code,
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });
    
    return {
      success: false,
      error: err.response?.data?.error || { 
        code: err.response?.data?.error?.code || 'PROGRESS_REQUEST_FAILED',
        message: err.response?.data?.error?.message || err.message || '진행도 조회 중 오류가 발생했습니다.' 
      },
    };
  }
};

