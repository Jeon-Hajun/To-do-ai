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
puts "최신 커밋 가져오기"
puts "=========================================="

send "cd $PROJECT_DIR && git pull origin main\r"
expect "$ "

puts "=========================================="
puts "최근 커밋 로그 확인"
puts "=========================================="

send "git log --oneline -10\r"
expect "$ "

send "exit\r"
expect eof

