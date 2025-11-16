#!/usr/bin/expect -f

set timeout 60
set SSH_HOST "webdev@220.69.240.143"
set SSH_PORT "22001"
set SSH_PASSWORD "webroqkfwk2025"

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
puts "GPU 확인 중..."
send "nvidia-smi\r"
expect "$ "

# CUDA 확인
send "nvcc --version 2>/dev/null || echo CUDA_없음\r"
expect "$ "

# Ollama 프로세스 확인
send "ps aux | grep ollama | grep -v grep\r"
expect "$ "

# Ollama 서비스 상태 확인
send "systemctl status ollama.service | head -20\r"
expect "$ "

# Ollama 환경변수 확인
send "systemctl show ollama.service | grep -i cuda || echo CUDA_환경변수_없음\r"
expect "$ "

puts "=========================================="
puts "GPU 상태 확인 완료!"
puts "=========================================="

send "exit\r"
expect eof

