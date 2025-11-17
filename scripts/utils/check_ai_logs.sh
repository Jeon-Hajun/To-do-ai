#!/usr/bin/expect -f

set timeout 30
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

# AI 백엔드 로그 전체 확인
send "tail -100 $PROJECT_DIR/ai-backend/ai-backend.log 2>/dev/null | tail -50\r"
expect "$ "

# Ollama 상태 확인
send "curl -s http://localhost:11434/api/tags | head -20 || echo 'Ollama 연결 실패'\r"
expect "$ "

# AI 백엔드 프로세스 확인
send "ps aux | grep 'python.*app.py' | grep -v grep\r"
expect "$ "

puts "=========================================="
puts "로그 확인 완료!"
puts "=========================================="

send "exit\r"
expect eof

