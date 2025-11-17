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

puts "=========================================="
puts "백엔드 API 테스트"
puts "=========================================="

send "curl -X POST http://localhost:3001/api/user/signup -H 'Content-Type: application/json' -d '{\"email\":\"test@test.com\",\"password\":\"test123\",\"nickname\":\"test\"}' 2>&1 | head -20\r"
expect "$ "

puts "=========================================="
puts "백엔드 로그 확인"
puts "=========================================="

send "tail -30 $PROJECT_DIR/backend.log | grep -E 'signup|user|error|Error' | tail -10\r"
expect "$ "

send "exit\r"
expect eof

