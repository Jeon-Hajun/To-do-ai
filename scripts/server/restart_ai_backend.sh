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
puts "AI 백엔드 재시작"
puts "=========================================="

# 포트 5001 사용 프로세스 종료
send "lsof -ti:5001 | xargs kill -9 2>/dev/null || echo 포트_프로세스_없음\r"
expect "$ "

# 기존 프로세스 종료
send "pkill -9 -f 'python.*app.py' || echo 프로세스_없음\r"
expect "$ "

send "sleep 3\r"
expect "$ "

send "cd $PROJECT_DIR/ai-backend\r"
expect "$ "

# AI 백엔드 시작 (버퍼링 비활성화)
send "source venv/bin/activate && PYTHONUNBUFFERED=1 nohup python -u app.py > ai-backend.log 2>&1 &\r"
expect "$ "

send "sleep 5\r"
expect "$ "

# 프로세스 확인
send "ps aux | grep 'python.*app.py' | grep -v grep || echo Python_프로세스_없음\r"
expect "$ "

# 포트 확인
send "lsof -i:5001 || echo 포트_확인_실패\r"
expect "$ "

# 로그 확인
send "tail -10 ai-backend.log 2>/dev/null | grep -E 'Running|모델|Ollama|Error' || tail -10 ai-backend.log\r"
expect "$ "

puts "=========================================="
puts "AI 백엔드 재시작 완료!"
puts "=========================================="

send "exit\r"
expect eof



