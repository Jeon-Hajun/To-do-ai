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

# Ollama 모델 확인
send "curl -s http://localhost:11434/api/tags\r"
expect "$ "

# qwen2.5:7b 모델이 있는지 확인
send "curl -s http://localhost:11434/api/tags | grep -q qwen2.5:7b && echo qwen2.5:7b_설치됨 || echo qwen2.5:7b_없음\r"
expect "$ "

# 없으면 설치 안내
send "if ! curl -s http://localhost:11434/api/tags | grep -q qwen2.5:7b; then echo qwen2.5:7b_모델_설치_필요; fi\r"
expect "$ "

# AI 백엔드 환경변수 확인
send "cd $PROJECT_DIR/ai-backend && grep OLLAMA_MODEL .env 2>/dev/null || echo '.env 파일 없음'\r"
expect "$ "

puts "=========================================="
puts "모델 확인 완료!"
puts "=========================================="

send "exit\r"
expect eof

