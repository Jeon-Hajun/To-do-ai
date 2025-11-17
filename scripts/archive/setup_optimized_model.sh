#!/usr/bin/expect -f

set timeout 300
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

# qwen2.5:7b 모델 설치 (백그라운드로 실행)
puts "qwen2.5:7b 모델 설치 시작 (시간이 걸릴 수 있습니다)..."
send "nohup ollama pull qwen2.5:7b > /tmp/ollama_pull.log 2>&1 &\r"
expect "$ "

send "echo 모델_설치_백그라운드_시작됨_PID:\r"
expect "$ "

# .env 파일 업데이트
send "cd $PROJECT_DIR/ai-backend\r"
expect "$ "

send "test -f .env && sed -i s/OLLAMA_MODEL=.*/OLLAMA_MODEL=qwen2.5:7b/ .env || echo OLLAMA_MODEL=qwen2.5:7b >> .env\r"
expect "$ "

send "grep OLLAMA_MODEL .env\r"
expect "$ "

puts "=========================================="
puts "설정 완료!"
puts "=========================================="
puts "참고: qwen2.5:7b 모델 설치가 완료되면 AI 백엔드를 재시작하세요."
puts "설치 진행 상황 확인: tail -f /tmp/ollama_pull.log"

send "exit\r"
expect eof

