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

# 기존 백엔드 프로세스 종료
send "pkill -f 'node.*bin/www' || pkill -f 'node.*app.js' || true\r"
expect "$ "

# 기존 AI 백엔드 프로세스 종료
send "pkill -f 'python.*app.py' || true\r"
expect "$ "

# 잠시 대기
send "sleep 2\r"
expect "$ "

# 백엔드 재시작
send "cd $PROJECT_DIR/backend\r"
expect "$ "

send "nohup node ./bin/www > backend.log 2>&1 &\r"
expect "$ "

# AI 백엔드 재시작
send "cd $PROJECT_DIR/ai-backend\r"
expect "$ "

send "source venv/bin/activate && nohup python app.py > ai-backend.log 2>&1 &\r"
expect "$ "

# 프로세스 확인
send "sleep 2\r"
expect "$ "

send "ps aux | grep -E 'node.*bin/www|python.*app.py' | grep -v grep\r"
expect "$ "

# 로그 확인
send "tail -20 $PROJECT_DIR/backend/backend.log 2>/dev/null || echo '백엔드 로그 없음'\r"
expect "$ "

send "tail -20 $PROJECT_DIR/ai-backend/ai-backend.log 2>/dev/null || echo 'AI 백엔드 로그 없음'\r"
expect "$ "

puts "=========================================="
puts "백엔드 재시작 완료!"
puts "=========================================="

send "exit\r"
expect eof

