# 스크립트 디렉토리 구조

이 디렉토리는 프로젝트의 shell 스크립트들을 카테고리별로 정리한 것입니다.

## 디렉토리 구조

### `dev/` - 로컬 개발용 스크립트
- `start-dev.sh`: 로컬 개발 환경 시작 (백엔드, AI 백엔드, 프론트엔드)

### `server/` - 서버 배포/관리용 스크립트
- `auto_deploy.sh`: 자동 배포 스크립트
- `restart_backend.sh`: 백엔드 재시작
- `restart_ai_backend.sh`: AI 백엔드 재시작
- `check_server.sh`: 서버 상태 확인
- 기타 서버 관리 스크립트들

### `utils/` - 유틸리티 스크립트
- 다양한 체크 및 유틸리티 스크립트들

### `archive/` - 보관용 스크립트
- GPU, 모델, Ollama 관련 스크립트들 (현재 사용하지 않음)

## 주요 스크립트 사용법

### 로컬 개발 시작
```bash
./scripts/dev/start-dev.sh
```

### 서버 배포
```bash
./scripts/server/auto_deploy.sh
```

### 백엔드 재시작
```bash
./scripts/server/restart_backend.sh
```

### AI 백엔드 재시작
```bash
./scripts/server/restart_ai_backend.sh
```

