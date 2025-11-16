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

# React 프론트엔드 시작
puts "=========================================="
puts "React 프론트엔드 시작"
puts "=========================================="

send "cd $PROJECT_DIR/morpheus-react/web\r"
expect "$ "

send "ps aux | grep 'react-scripts' | grep -v grep\r"
expect "$ "

send "if ! ps aux | grep -q react-scripts | grep -v grep; then nohup npm start > react.log 2>&1 &; echo React_시작됨; else echo React_이미_실행중; fi\r"
expect "$ "

send "sleep 3\r"
expect "$ "

# 프로세스 확인
send "ps aux | grep 'react-scripts\|npm.*start' | grep -v grep | head -2\r"
expect "$ "

puts "=========================================="
puts "서비스 시작 완료!"
puts "=========================================="

send "exit\r"
expect eof

