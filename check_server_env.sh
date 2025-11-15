#!/bin/bash

# 서버 환경 변수 확인 및 수정 스크립트
# SSH 접속 후 실행: bash check_server_env.sh

echo "=========================================="
echo "서버 환경 변수 확인 및 수정"
echo "=========================================="

PROJECT_DIR="/home/webdev/AutoPM/To-do-ai"
FRONTEND_ENV="$PROJECT_DIR/morpheus-react/web/.env"

echo ""
echo "1. 현재 프론트엔드 .env 파일 확인:"
if [ -f "$FRONTEND_ENV" ]; then
    echo "파일 존재함"
    cat "$FRONTEND_ENV"
else
    echo "파일이 존재하지 않습니다. 생성합니다..."
    cat > "$FRONTEND_ENV" << EOF
REACT_APP_API_URL=http://220.69.240.143:3001
REACT_APP_AI_API_URL=http://220.69.240.143:5001
EOF
    echo "파일 생성 완료"
    cat "$FRONTEND_ENV"
fi

echo ""
echo "2. 환경 변수 확인:"
cd "$PROJECT_DIR/morpheus-react/web"
if grep -q "REACT_APP_API_URL=http://220.69.240.143:3001" "$FRONTEND_ENV"; then
    echo "✓ REACT_APP_API_URL 설정 확인됨"
else
    echo "✗ REACT_APP_API_URL 설정이 올바르지 않습니다"
    echo "수정 중..."
    sed -i 's|REACT_APP_API_URL=.*|REACT_APP_API_URL=http://220.69.240.143:3001|g' "$FRONTEND_ENV"
    echo "수정 완료"
fi

if grep -q "REACT_APP_AI_API_URL=http://220.69.240.143:5001" "$FRONTEND_ENV"; then
    echo "✓ REACT_APP_AI_API_URL 설정 확인됨"
else
    echo "✗ REACT_APP_AI_API_URL 설정이 올바르지 않습니다"
    echo "수정 중..."
    sed -i 's|REACT_APP_AI_API_URL=.*|REACT_APP_AI_API_URL=http://220.69.240.143:5001|g' "$FRONTEND_ENV"
    echo "수정 완료"
fi

echo ""
echo "3. 최종 .env 파일 내용:"
cat "$FRONTEND_ENV"

echo ""
echo "=========================================="
echo "중요: 환경 변수 변경 후 프론트엔드 재빌드 필요!"
echo "=========================================="
echo ""
echo "다음 명령어 실행:"
echo "cd $PROJECT_DIR/morpheus-react/web"
echo "npm run build  # 또는 개발 모드: npm run dev"
echo "pm2 restart frontend"



