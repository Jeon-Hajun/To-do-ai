// API 설정 파일
// 환경 변수에서 API URL을 가져오거나 기본값 사용
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
export const AI_API_BASE_URL = process.env.REACT_APP_AI_API_URL || 'http://localhost:5001';

// API 엔드포인트
export const API_ENDPOINTS = {
  USER: `${API_BASE_URL}/api/user`,
  PROJECT: `${API_BASE_URL}/api/project`,
  TASK: `${API_BASE_URL}/api/task`,
  GITHUB: `${API_BASE_URL}/api/github`,
  AI: `${AI_API_BASE_URL}/api/ai`,
};

