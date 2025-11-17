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

# 서비스 상태 확인
puts "=========================================="
puts "서비스 상태 확인"
puts "=========================================="

send "ps aux | grep 'node.*www' | grep -v grep\r"
expect "$ "

send "ps aux | grep 'python.*app.py' | grep -v grep\r"
expect "$ "

send "ps aux | grep 'react-scripts' | grep -v grep\r"
expect "$ "

send "echo $SSH_PASSWORD | sudo -S systemctl is-active ollama.service\r"
expect "$ "

send "echo $SSH_PASSWORD | sudo -S systemctl is-active mysql.service\r"
expect "$ "

# React 프론트엔드 시작
puts "=========================================="
puts "React 프론트엔드 시작"
puts "=========================================="

send "cd $PROJECT_DIR/morpheus-react/web\r"
expect "$ "

send "nohup npm start > react.log 2>&1 &\r"
expect "$ "

send "sleep 5\r"
expect "$ "

# 최종 확인
puts "=========================================="
puts "최종 상태 확인"
puts "=========================================="

send "ps aux | grep 'react-scripts\|npm.*start' | grep -v grep\r"
expect "$ "

send "ps aux | grep 'node.*www' | grep -v grep\r"
expect "$ "

send "ps aux | grep 'python.*app.py' | grep -v grep\r"
expect "$ "

puts "=========================================="
puts "서비스 시작 완료!"
puts "=========================================="

send "exit\r"
expect eof

