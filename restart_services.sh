#!/bin/bash

# 서버 서비스 재시작 스크립트 (webdev 사용자용)
# SSH 접속 후 실행: bash restart_services.sh

set -e

echo "=========================================="
echo "서비스 재시작 시작"
echo "=========================================="

# 프로젝트 디렉토리로 이동
cd /home/webdev/AutoPM/To-do-ai

# logs 디렉토리 생성
mkdir -p logs

echo ""
echo "1. 기존 To-do-ai 프로젝트 프로세스만 종료 중..."
# To-do-ai 프로젝트 디렉토리에서 실행 중인 프로세스만 안전하게 종료
PROJECT_DIR="/home/webdev/AutoPM/To-do-ai"
ps aux | grep "$PROJECT_DIR" | grep -E "(node.*app.js|python.*app.py|react-scripts)" | grep -v grep | awk '{print $2}' | xargs -r kill 2>/dev/null || true
sleep 2

echo ""
echo "2. 백엔드 (Node.js) 시작 중..."
cd backend
if [ -f .env ]; then
    nohup npm start > ../logs/backend.log 2>&1 &
    echo "백엔드 시작됨 (포트 3001)"
else
    echo "경고: .env 파일이 없습니다"
fi
cd ..

echo ""
echo "3. AI 백엔드 (Flask) 시작 중..."
cd ai-backend
if [ -d venv ]; then
    source venv/bin/activate
    nohup python app.py > ../logs/ai-backend.log 2>&1 &
    deactivate
    echo "AI 백엔드 시작됨 (포트 5001)"
else
    echo "경고: venv 디렉토리가 없습니다"
fi
cd ..

echo ""
echo "4. 프론트엔드 (React) 시작 중..."
cd morpheus-react/web
if [ -f package.json ]; then
    # vite 사용 여부 확인
    if grep -q '"vite"' package.json; then
        nohup npm run dev > ../../logs/frontend.log 2>&1 &
        echo "프론트엔드 시작됨 (Vite, 포트 5175)"
    else
        nohup npm start > ../../logs/frontend.log 2>&1 &
        echo "프론트엔드 시작됨 (React Scripts, 포트 5175)"
    fi
else
    echo "경고: package.json 파일이 없습니다"
fi
cd ../../

echo ""
echo "5초 대기 중..."
sleep 5

echo ""
echo "=========================================="
echo "서비스 상태 확인"
echo "=========================================="

echo ""
echo "프로세스 확인 (To-do-ai 프로젝트만):"
ps aux | grep "$PROJECT_DIR" | grep -E "(node|python|react-scripts)" | grep -v grep || echo "프로세스를 찾을 수 없습니다"

echo ""
echo "포트 확인:"
ss -tlnp 2>/dev/null | grep -E "(3001|5001|5175)" || netstat -tlnp 2>/dev/null | grep -E "(3001|5001|5175)" || echo "포트를 확인할 수 없습니다"

echo ""
echo "로그 파일 확인:"
ls -lh logs/ 2>/dev/null || echo "로그 파일이 없습니다"

echo ""
echo "=========================================="
echo "완료!"
echo "=========================================="

