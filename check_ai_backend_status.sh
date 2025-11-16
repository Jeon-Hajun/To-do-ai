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
puts "AI 백엔드 상태 확인"
puts "=========================================="

# 프로세스 확인
send "ps aux | grep 'python.*app.py' | grep -v grep || echo 프로세스_없음\r"
expect "$ "

# 포트 확인
send "lsof -i:5001 || echo 포트_확인_실패\r"
expect "$ "

# 최근 로그 확인
send "cd $PROJECT_DIR/ai-backend && tail -30 ai-backend.log 2>/dev/null || echo 로그_없음\r"
expect "$ "

# 에러 로그 확인
send "tail -50 ai-backend.log 2>/dev/null | grep -i 'error\\|exception\\|traceback\\|failed' | tail -10 || echo 에러_없음\r"
expect "$ "

puts "=========================================="
puts "확인 완료!"
puts "=========================================="

send "exit\r"
expect eof



