#!/bin/bash

# 서버 업데이트 및 재시작 스크립트
# SSH 접속 후 실행: bash server_update.sh

set -e

echo "=========================================="
echo "서버 업데이트 및 재시작 시작"
echo "=========================================="

# 프로젝트 디렉토리로 이동
cd /home/webdev/AutoPM/To-do-ai

echo ""
echo "1. Git pull 실행 중..."
git pull origin main

echo ""
echo "2. 백엔드 재시작 중..."
cd backend
# pm2 사용 시
pm2 restart backend 2>/dev/null || {
    echo "pm2로 재시작 실패, 직접 실행 시도..."
    pkill -f "node.*app.js" || true
    nohup npm start > ../logs/backend.log 2>&1 &
}

echo ""
echo "3. AI 백엔드 재시작 중..."
cd ../ai-backend
# pm2 사용 시
pm2 restart ai-backend 2>/dev/null || {
    echo "pm2로 재시작 실패, 직접 실행 시도..."
    pkill -f "python.*app.py" || true
    source venv/bin/activate
    nohup python app.py > ../logs/ai-backend.log 2>&1 &
    deactivate
}

echo ""
echo "4. 프론트엔드 재시작 중..."
cd ../morpheus-react/web
# pm2 사용 시
pm2 restart frontend 2>/dev/null || {
    echo "pm2로 재시작 실패, 직접 실행 시도..."
    pkill -f "vite" || true
    nohup npm run dev > ../../logs/frontend.log 2>&1 &
}

echo ""
echo "=========================================="
echo "서버 상태 확인"
echo "=========================================="

echo ""
echo "프로세스 확인:"
ps aux | grep -E "(node|python|vite)" | grep -v grep || echo "프로세스를 찾을 수 없습니다"

echo ""
echo "포트 확인:"
netstat -tlnp | grep -E "(3001|5001|5175)" || ss -tlnp | grep -E "(3001|5001|5175)" || echo "포트를 확인할 수 없습니다"

echo ""
echo "=========================================="
echo "완료!"
echo "=========================================="

