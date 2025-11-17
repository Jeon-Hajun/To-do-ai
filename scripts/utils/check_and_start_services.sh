#!/usr/bin/expect -f

set timeout 60
set SSH_HOST "webdev@220.69.240.143"
set SSH_PORT "22001"
set SSH_PASSWORD "webroqkfwk2025"
set PROJECT_DIR "/home/webdev/AutoPM/To-do-ai"

spawn ssh -p $SSH_PORT $SSH_HOST

expect {
    "password:" {
        send "$SSH_PASSWORD\r"
        exp_continue
    }
    "$ " {
        puts "SSH 접속 성공!"
    }
}

# 1. 서비스 상태 확인
puts "=========================================="
puts "1. 서비스 상태 확인"
puts "=========================================="

# Ollama 서비스 확인
send "echo $SSH_PASSWORD | sudo -S systemctl status ollama.service | head -10\r"
expect "$ "

# Node.js 백엔드 확인
send "ps aux | grep 'node.*www' | grep -v grep || echo Node.js_백엔드_없음\r"
expect "$ "

# Python Flask AI 백엔드 확인
send "ps aux | grep 'python.*app.py' | grep -v grep || echo Python_AI_백엔드_없음\r"
expect "$ "

# React 프론트엔드 확인
send "ps aux | grep 'react-scripts\|npm.*start\|node.*react' | grep -v grep || echo React_프론트엔드_없음\r"
expect "$ "

# MySQL 확인
send "echo $SSH_PASSWORD | sudo -S systemctl status mysql.service | head -5 || echo MySQL_확인_실패\r"
expect "$ "

# 2. 필요한 서비스 시작
puts "=========================================="
puts "2. 서비스 시작"
puts "=========================================="

# Ollama 서비스 시작
send "echo $SSH_PASSWORD | sudo -S systemctl start ollama.service\r"
expect "$ "

send "sleep 3\r"
expect "$ "

# Node.js 백엔드 시작
send "cd $PROJECT_DIR/backend\r"
expect "$ "

send "if ! ps aux | grep -q 'node.*www' | grep -v grep; then nohup node ./bin/www > backend.log 2>&1 &; echo Node.js_백엔드_시작됨; else echo Node.js_백엔드_이미_실행중; fi\r"
expect "$ "

send "sleep 2\r"
expect "$ "

# Python Flask AI 백엔드 시작
send "cd $PROJECT_DIR/ai-backend\r"
expect "$ "

send "if ! ps aux | grep -q 'python.*app.py' | grep -v grep; then source venv/bin/activate && nohup python app.py > ai-backend.log 2>&1 &; echo Python_AI_백엔드_시작됨; else echo Python_AI_백엔드_이미_실행중; fi\r"
expect "$ "

send "sleep 2\r"
expect "$ "

# React 프론트엔드 시작 (프로젝트 구조 확인 필요)
send "cd $PROJECT_DIR\r"
expect "$ "

send "if [ -d morpheus-react/web ]; then cd morpheus-react/web; if ! ps aux | grep -q 'react-scripts\|npm.*start' | grep -v grep; then nohup npm start > react.log 2>&1 &; echo React_프론트엔드_시작됨; else echo React_프론트엔드_이미_실행중; fi; else echo React_프로젝트_경로_없음; fi\r"
expect "$ "

send "sleep 2\r"
expect "$ "

# 3. 최종 상태 확인
puts "=========================================="
puts "3. 최종 상태 확인"
puts "=========================================="

send "echo '=== Ollama ===' && echo $SSH_PASSWORD | sudo -S systemctl is-active ollama.service\r"
expect "$ "

send "echo '=== Node.js 백엔드 ===' && ps aux | grep 'node.*www' | grep -v grep | head -1 || echo 없음\r"
expect "$ "

send "echo '=== Python AI 백엔드 ===' && ps aux | grep 'python.*app.py' | grep -v grep | head -1 || echo 없음\r"
expect "$ "

send "echo '=== React 프론트엔드 ===' && ps aux | grep 'react-scripts\|npm.*start' | grep -v grep | head -1 || echo 없음\r"
expect "$ "

send "echo '=== MySQL ===' && echo $SSH_PASSWORD | sudo -S systemctl is-active mysql.service\r"
expect "$ "

puts "=========================================="
puts "서비스 시작 완료!"
puts "=========================================="

send "exit\r"
expect eof

