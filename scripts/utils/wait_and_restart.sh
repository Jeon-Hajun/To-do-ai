#!/usr/bin/expect -f

set timeout 600
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

# 모델 설치 완료 대기
puts "qwen2.5:7b 모델 설치 완료 대기 중..."
send "while ! curl -s http://localhost:11434/api/tags | grep -q qwen2.5:7b; do sleep 10; echo 모델_설치_대기중...; done\r"
expect "$ "

puts "모델 설치 완료! AI 백엔드 재시작 중..."

# AI 백엔드 재시작
send "cd $PROJECT_DIR/ai-backend\r"
expect "$ "

send "pkill -f 'python.*app.py' || true\r"
expect "$ "

send "sleep 2\r"
expect "$ "

send "source venv/bin/activate && nohup python app.py > ai-backend.log 2>&1 &\r"
expect "$ "

send "sleep 2\r"
expect "$ "

# 프로세스 확인
send "ps aux | grep 'python.*app.py' | grep -v grep\r"
expect "$ "

# 로그 확인
send "tail -10 ai-backend.log\r"
expect "$ "

puts "=========================================="
puts "재시작 완료!"
puts "=========================================="

send "exit\r"
expect eof

