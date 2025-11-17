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

# GPU 확인
send "nvidia-smi 2>/dev/null | head -10 || echo GPU_없음\r"
expect "$ "

# Ollama 환경변수 확인
send "env | grep -i ollama || echo Ollama_환경변수_없음\r"
expect "$ "

# Ollama 서비스 환경변수 확인
send "systemctl show ollama.service | grep Environment || echo 환경변수_없음\r"
expect "$ "

# AI 백엔드 .env 확인
send "cd $PROJECT_DIR/ai-backend && cat .env 2>/dev/null | grep -v '^#' || echo .env_파일_없음\r"
expect "$ "

# Ollama 실행 중인 프로세스 확인
send "ps aux | grep ollama | grep -v grep | head -3\r"
expect "$ "

# Ollama API로 모델 확인
send "curl -s http://localhost:11434/api/tags | python3 -m json.tool 2>/dev/null | grep -A 2 name || curl -s http://localhost:11434/api/tags\r"
expect "$ "

puts "=========================================="
puts "확인 완료!"
puts "=========================================="

send "exit\r"
expect eof

