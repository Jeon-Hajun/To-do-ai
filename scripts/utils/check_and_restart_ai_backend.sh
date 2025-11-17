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

# 에러 로그 확인
puts "=========================================="
puts "에러 로그 확인"
puts "=========================================="

send "cd $PROJECT_DIR/ai-backend\r"
expect "$ "

send "tail -20 ai-backend.log 2>/dev/null || echo 로그_없음\r"
expect "$ "

# Python 문법 확인
send "source venv/bin/activate && python -m py_compile prompt_optimizer.py 2>&1 || echo 문법_오류\r"
expect "$ "

# AI 백엔드 재시작
puts "=========================================="
puts "AI 백엔드 재시작"
puts "=========================================="

send "cd $PROJECT_DIR/ai-backend\r"
expect "$ "

send "source venv/bin/activate && nohup python app.py > ai-backend.log 2>&1 &\r"
expect "$ "

send "sleep 3\r"
expect "$ "

# 프로세스 확인
send "ps aux | grep 'python.*app.py' | grep -v grep\r"
expect "$ "

send "tail -10 ai-backend.log 2>/dev/null\r"
expect "$ "

puts "=========================================="
puts "완료!"
puts "=========================================="

send "exit\r"
expect eof

