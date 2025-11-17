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

# 간단한 테스트 요청
send "curl -X POST http://localhost:5001/api/ai/task-suggestion -H 'Content-Type: application/json' -d '{\"commits\":[],\"issues\":[],\"currentTasks\":[],\"projectDescription\":\"테스트\",\"githubRepo\":\"\"}' 2>&1\r"
expect "$ "

# AI 백엔드 로그 실시간 확인 (최근 20줄)
send "tail -20 $PROJECT_DIR/ai-backend/ai-backend.log 2>&1\r"
expect "$ "

puts "=========================================="
puts "테스트 완료!"
puts "=========================================="

send "exit\r"
expect eof

