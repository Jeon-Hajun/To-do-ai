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
puts "최신 코드 pull 및 모델 확인"
puts "=========================================="

send "cd $PROJECT_DIR && git pull origin main\r"
expect "$ "

send "cd ai-backend\r"
expect "$ "

send "grep OLLAMA_MODEL app.py | head -1\r"
expect "$ "

send "grep OLLAMA_MODEL .env 2>/dev/null || echo .env_없음\r"
expect "$ "

puts "=========================================="
puts "AI 백엔드 재시작"
puts "=========================================="

send "pkill -f 'python.*app.py' || echo 프로세스_없음\r"
expect "$ "

send "sleep 2\r"
expect "$ "

send "source venv/bin/activate && nohup python app.py > ai-backend.log 2>&1 &\r"
expect "$ "

send "sleep 3\r"
expect "$ "

send "ps aux | grep 'python.*app.py' | grep -v grep || echo Python_프로세스_없음\r"
expect "$ "

send "tail -5 ai-backend.log 2>/dev/null | grep -i '모델' || tail -5 ai-backend.log\r"
expect "$ "

puts "=========================================="
puts "모델 변경 완료!"
puts "=========================================="

send "exit\r"
expect eof

