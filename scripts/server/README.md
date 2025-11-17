# 서버 관리 스크립트

## 주요 스크립트

### `auto_deploy.sh`
자동 배포 스크립트. GitHub에서 최신 코드를 가져와서 서버에 배포합니다.

### `restart_backend.sh`
백엔드 서버를 재시작합니다.

### `restart_ai_backend.sh`
AI 백엔드 서버를 재시작합니다.

### `check_server.sh`
서버 상태를 확인합니다.

### `pull_commits.sh`
GitHub에서 최신 커밋을 가져옵니다.

### `server_deploy.sh`
서버 배포 스크립트입니다.

### `server_update.sh`
서버 업데이트 스크립트입니다.

### `update_and_restart_server.sh`
서버를 업데이트하고 재시작합니다.

## 사용법

모든 스크립트는 expect를 사용하여 SSH로 원격 서버에 접속합니다.
실행 권한이 필요합니다:

```bash
chmod +x scripts/server/*.sh
```

