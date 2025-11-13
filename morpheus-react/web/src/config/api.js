// API 설정 파일
// 환경 변수에서 API URL을 가져오거나 기본값 사용
// 서버 환경: REACT_APP_API_URL=http://220.69.240.143:3001
const isProduction = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost';
const DEFAULT_API_URL = isProduction ? 'http://220.69.240.143:3001' : 'http://localhost:3001';
const DEFAULT_AI_API_URL = isProduction ? 'http://220.69.240.143:5001' : 'http://localhost:5001';

export const API_BASE_URL = process.env.REACT_APP_API_URL || DEFAULT_API_URL;
export const AI_API_BASE_URL = process.env.REACT_APP_AI_API_URL || DEFAULT_AI_API_URL;

// 개발 환경에서 API URL 확인 (콘솔에 출력)
if (process.env.NODE_ENV === 'development') {
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('AI_API_BASE_URL:', AI_API_BASE_URL);
}

// API 엔드포인트
export const API_ENDPOINTS = {
  USER: `${API_BASE_URL}/api/user`,
  PROJECT: `${API_BASE_URL}/api/project`,
  TASK: `${API_BASE_URL}/api/task`,
  GITHUB: `${API_BASE_URL}/api/github`,
  AI: `${API_BASE_URL}/api/ai`, // Node.js 백엔드를 통해 AI 백엔드에 접근
};

