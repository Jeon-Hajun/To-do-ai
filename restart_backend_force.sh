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
puts "백엔드 강제 재시작"
puts "=========================================="

# 포트 3001 사용 프로세스 확인 및 종료
send "lsof -ti:3001 | xargs kill -9 2>/dev/null || echo 포트_사용_프로세스_없음\r"
expect "$ "

# 기존 프로세스 종료
send "pkill -9 -f 'node.*app.js' || pkill -9 -f 'npm.*start' || echo 프로세스_없음\r"
expect "$ "

send "sleep 3\r"
expect "$ "

send "cd $PROJECT_DIR/backend\r"
expect "$ "

# 백엔드 시작
send "nohup npm start > backend.log 2>&1 &\r"
expect "$ "

send "sleep 5\r"
expect "$ "

# 프로세스 확인
send "ps aux | grep -E 'node.*app.js|npm.*start' | grep -v grep || echo Node_프로세스_없음\r"
expect "$ "

# 포트 확인
send "lsof -i:3001 || echo 포트_확인_실패\r"
expect "$ "

# 로그 확인
send "tail -15 backend.log 2>/dev/null || echo 로그_없음\r"
expect "$ "

puts "=========================================="
puts "백엔드 재시작 완료!"
puts "=========================================="

send "exit\r"
expect eof

