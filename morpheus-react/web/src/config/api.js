// API 설정 파일
// 환경 변수에서 API URL을 가져오거나 기본값 사용
// Vite 환경 변수: VITE_API_URL=http://localhost:3001/api
// Vite 환경 변수: VITE_API_PORT=3001 (포트만 지정 시)
// Vite 환경 변수: VITE_PRODUCTION_SERVER=220.69.240.143 (실제 서버 주소)
// 서버 환경에서는 자동으로 현재 호스트의 지정된 포트 사용
// 안드로이드 앱: 에뮬레이터에서 실제 서버로 직접 연결 가능

const getApiBaseUrl = () => {
  // 환경 변수 VITE_API_URL이 있으면 우선 사용
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const apiPort = import.meta.env.VITE_API_PORT || '3001';
  const productionServer = import.meta.env.VITE_PRODUCTION_SERVER || '220.69.240.143';
  
  // 실제 배포 서버에서 접근하는 경우
  if (hostname === productionServer || hostname === '220.69.240.143') {
    return `http://${productionServer}:${apiPort}/api`;
  }
  
  // 안드로이드 에뮬레이터에서 실제 서버로 직접 연결하는 경우
  // (에뮬레이터는 인터넷을 통해 실제 서버에 접근 가능)
  if (hostname === '10.0.2.2') {
    // 환경 변수로 실제 서버 사용 여부 확인
    if (import.meta.env.VITE_USE_PRODUCTION_SERVER === 'true') {
      return `http://${productionServer}:${apiPort}/api`;
    }
    // 기본값: 로컬 개발 서버 사용
    return `http://10.0.2.2:${apiPort}/api`;
  }
  
  // 프로덕션 환경이거나 서버에서 실행 중이면 현재 호스트 사용
  if (import.meta.env.PROD || (hostname !== 'localhost' && hostname !== '127.0.0.1')) {
    return `${protocol}//${hostname}:${apiPort}/api`;
  }
  
  // 개발 환경 (localhost 또는 127.0.0.1)
  return `http://${hostname}:${apiPort}/api`;
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

