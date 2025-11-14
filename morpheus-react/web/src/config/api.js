// API 설정 파일
// 환경 변수에서 API URL을 가져오거나 기본값 사용
// Vite 환경 변수: VITE_API_URL=http://localhost:3001/api
// Vite 환경 변수: VITE_API_PORT=3001 (포트만 지정 시)
// 서버 환경에서는 자동으로 현재 호스트의 지정된 포트 사용

const getApiBaseUrl = () => {
  // 환경 변수 VITE_API_URL이 있으면 우선 사용
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 프로덕션 환경이거나 서버에서 실행 중이면 현재 호스트 사용
  if (import.meta.env.PROD || window.location.hostname !== 'localhost') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = import.meta.env.VITE_API_PORT || '3001';
    return `${protocol}//${hostname}:${port}/api`;
  }
  
  // 개발 환경 (localhost)
  const devPort = import.meta.env.VITE_API_PORT || '3001';
  return `http://localhost:${devPort}/api`;
};

const DEFAULT_API_BASE_URL = getApiBaseUrl();

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

