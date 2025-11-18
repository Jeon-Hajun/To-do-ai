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
puts "AI 백엔드 로그 확인"
puts "=========================================="

send "cd $PROJECT_DIR/ai-backend\r"
expect "$ "

send "tail -50 ai-backend.log 2>/dev/null || echo '로그 파일 없음'\r"
expect "$ "

puts "=========================================="
puts "Python 문법 확인"
puts "=========================================="

send "python3 -m py_compile app.py 2>&1 || echo '문법 오류 있음'\r"
expect "$ "

puts "=========================================="
puts "완료!"
puts "=========================================="

send "exit\r"
expect eof

