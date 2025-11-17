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
puts "모델을 14b로 변경"
puts "=========================================="

send "cd $PROJECT_DIR/ai-backend\r"
expect "$ "

# .env 파일 업데이트
send "test -f .env && sed -i 's/OLLAMA_MODEL=.*/OLLAMA_MODEL=qwen2.5:14b/' .env || echo OLLAMA_MODEL=qwen2.5:14b >> .env\r"
expect "$ "

send "grep OLLAMA_MODEL .env\r"
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

puts "=========================================="
puts "모델 변경 완료!"
puts "=========================================="

send "exit\r"
expect eof

