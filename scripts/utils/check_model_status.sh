#!/usr/bin/expect -f

set timeout 30
set SSH_HOST "webdev@220.69.240.143"
set SSH_PORT "22001"
set SSH_PASSWORD "webroqkfwk2025"

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

# 모델 설치 진행 상황 확인
send "ps aux | grep 'ollama pull' | grep -v grep || echo 모델_설치_프로세스_없음\r"
expect "$ "

# 모델 설치 로그 확인
send "tail -20 /tmp/ollama_pull.log 2>/dev/null || echo 로그_없음\r"
expect "$ "

# 설치된 모델 확인
send "curl -s http://localhost:11434/api/tags\r"
expect "$ "

puts "=========================================="
puts "모델 상태 확인 완료!"
puts "=========================================="

send "exit\r"
expect eof

