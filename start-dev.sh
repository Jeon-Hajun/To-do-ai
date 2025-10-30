#!/bin/bash

# Todo AI 개발 환경 시작 스크립트

echo "🚀 Todo AI 개발 환경을 시작합니다..."

# 터미널 창을 3개로 분할하여 각 서버 실행
osascript -e 'tell application "Terminal" to do script "cd /Users/rona/workspace/to-do-ai/backend && npm run dev"'
osascript -e 'tell application "Terminal" to do script "cd /Users/rona/workspace/to-do-ai/ai-backend && python app.py"'
osascript -e 'tell application "Terminal" to do script "cd /Users/rona/workspace/to-do-ai/morpheus-react && npm run dev"'

echo "✅ 모든 서버가 시작되었습니다!"
echo "📱 프론트엔드: http://localhost:5173"
echo "🔧 백엔드: http://localhost:3000"
echo "🤖 AI 백엔드: http://localhost:5000"
