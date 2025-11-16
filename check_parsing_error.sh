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

# AI 백엔드 로그 확인
puts "=========================================="
puts "AI 백엔드 로그 확인 (최근 50줄)"
puts "=========================================="

send "cd $PROJECT_DIR/ai-backend\r"
expect "$ "

send "tail -50 ai-backend.log | grep -A 10 -B 5 '파싱 실패\|JSON 파싱\|응답 내용' || tail -50 ai-backend.log\r"
expect "$ "

puts "=========================================="
puts "로그 확인 완료!"
puts "=========================================="

send "exit\r"
expect eof

