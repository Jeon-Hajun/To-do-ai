#!/usr/bin/expect -f

# 자동 배포 스크립트 (expect 사용)
# 사용법: ./auto_deploy.sh

set timeout 30
set SSH_HOST "webdev@220.69.240.143"
set SSH_PORT "22001"
set SSH_PASSWORD "webroqkfwk2025"
set PROJECT_DIR "/home/webdev/AutoPM/To-do-ai"

puts "=========================================="
puts "서버 자동 배포 시작"
puts "=========================================="

# SSH 접속
spawn ssh -p $SSH_PORT $SSH_HOST

expect {
    "password:" {
        send "$SSH_PASSWORD\r"
        exp_continue
    }
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    "$ " {
        puts "SSH 접속 성공!"
    }
    timeout {
        puts "SSH 접속 타임아웃"
        exit 1
    }
}

# 프로젝트 디렉토리로 이동
send "cd $PROJECT_DIR\r"
expect "$ "

# 현재 상태 확인
send "pwd\r"
expect "$ "

# Git 상태 확인
send "git status\r"
expect "$ "

# GitHub에서 최신 코드 가져오기
puts "GitHub에서 최신 코드 가져오는 중..."
send "git pull origin main\r"
expect {
    "Already up to date" {
        puts "이미 최신 상태입니다."
    }
    "$ " {
        puts "코드 업데이트 완료"
    }
    timeout {
        puts "Git pull 타임아웃"
    }
}

# 백엔드 프로세스 확인
puts "백엔드 프로세스 확인 중..."
send "ps aux | grep -E 'node.*app.js|node.*backend' | grep -v grep\r"
expect "$ "

# 백엔드 재시작 (PM2 사용 시)
puts "백엔드 재시작 중..."
send "cd $PROJECT_DIR/backend\r"
expect "$ "

# PM2로 재시작 시도
send "pm2 restart backend 2>/dev/null || pm2 start app.js --name backend 2>/dev/null || echo 'PM2 없음'\r"
expect "$ "

# PM2가 없으면 직접 실행
send "if ! command -v pm2 &> /dev/null; then pkill -f 'node.*app.js'; nohup node app.js > backend.log 2>&1 & fi\r"
expect "$ "

# AI 백엔드 프로세스 확인
puts "AI 백엔드 프로세스 확인 중..."
send "ps aux | grep -E 'python.*app.py|flask' | grep -v grep\r"
expect "$ "

# AI 백엔드 재시작
puts "AI 백엔드 재시작 중..."
send "cd $PROJECT_DIR/ai-backend\r"
expect "$ "

# 기존 프로세스 종료
send "pkill -f 'python.*app.py' || pkill -f 'flask' || true\r"
expect "$ "

# 가상환경 활성화 및 재시작
send "source venv/bin/activate && nohup python app.py > ai-backend.log 2>&1 &\r"
expect "$ "

# 프로세스 확인
puts "실행 중인 프로세스 확인 중..."
send "ps aux | grep -E 'node.*app.js|python.*app.py' | grep -v grep\r"
expect "$ "

puts "=========================================="
puts "배포 완료!"
puts "=========================================="

send "exit\r"
expect eof

