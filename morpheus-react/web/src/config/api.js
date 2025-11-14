// API 설정 파일
// 환경 변수에서 API URL을 가져오거나 기본값 사용
// Vite 환경 변수: VITE_API_URL=http://localhost:3001/api

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const API_BASE_URL = DEFAULT_API_BASE_URL;

// 개발 환경에서 API URL 확인 (콘솔에 출력)
if (import.meta.env.DEV) {
  console.log('API_BASE_URL:', API_BASE_URL);
}

// API 엔드포인트
export const API_ENDPOINTS = {
  USER: `${API_BASE_URL}/user`,
  PROJECT: `${API_BASE_URL}/project`,
  TASK: `${API_BASE_URL}/task`,
  GITHUB: `${API_BASE_URL}/github`,
  AI: `${API_BASE_URL}/ai`,
};

