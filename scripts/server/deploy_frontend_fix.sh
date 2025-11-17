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

# 프론트엔드 코드 업데이트
puts "=========================================="
puts "프론트엔드 코드 업데이트"
puts "=========================================="

send "cd $PROJECT_DIR\r"
expect "$ "

send "git pull origin main\r"
expect "$ "

# React 프로세스 확인 및 재시작
puts "=========================================="
puts "React 프론트엔드 재시작"
puts "=========================================="

send "pkill -f 'react-scripts\|npm.*start' || echo 프로세스_없음\r"
expect "$ "

send "sleep 2\r"
expect "$ "

send "cd $PROJECT_DIR/morpheus-react/web\r"
expect "$ "

send "nohup npm start > react.log 2>&1 &\r"
expect "$ "

send "sleep 5\r"
expect "$ "

# 프로세스 확인
send "ps aux | grep 'react-scripts\|npm.*start' | grep -v grep || echo React_프로세스_없음\r"
expect "$ "

send "tail -5 react.log 2>/dev/null || echo 로그_없음\r"
expect "$ "

puts "=========================================="
puts "배포 완료!"
puts "=========================================="

send "exit\r"
expect eof

