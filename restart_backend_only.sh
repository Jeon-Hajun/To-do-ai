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
puts "백엔드 재시작"
puts "=========================================="

send "cd $PROJECT_DIR/backend\r"
expect "$ "

# 기존 프로세스 종료
send "pkill -f 'node.*app.js' || pkill -f 'npm.*start' || echo 프로세스_없음\r"
expect "$ "

send "sleep 2\r"
expect "$ "

# 백엔드 시작
send "nohup npm start > backend.log 2>&1 &\r"
expect "$ "

send "sleep 3\r"
expect "$ "

# 프로세스 확인
send "ps aux | grep -E 'node.*app.js|npm.*start' | grep -v grep || echo Node_프로세스_없음\r"
expect "$ "

# 로그 확인
send "tail -10 backend.log 2>/dev/null || echo 로그_없음\r"
expect "$ "

puts "=========================================="
puts "백엔드 재시작 완료!"
puts "=========================================="

send "exit\r"
expect eof

