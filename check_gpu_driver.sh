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

# GPU 하드웨어 확인
puts "GPU 하드웨어 확인 중..."
send "lspci | grep -i nvidia || lspci | grep -i vga\r"
expect "$ "

# NVIDIA 드라이버 확인
send "lsmod | grep nvidia || echo NVIDIA_드라이버_없음\r"
expect "$ "

# NVIDIA 드라이버 버전 확인
send "cat /proc/driver/nvidia/version 2>/dev/null || echo NVIDIA_드라이버_미설치\r"
expect "$ "

# CUDA 라이브러리 확인
send "ldconfig -p | grep cuda || echo CUDA_라이브러리_없음\r"
expect "$ "

# Ollama가 GPU를 사용하는지 확인 (실제 요청으로 테스트)
send "curl -s http://localhost:11434/api/generate -d '{\"model\":\"qwen2.5:14b\",\"prompt\":\"test\",\"stream\":false}' --max-time 5 2>&1 | head -5 || echo 테스트_실패\r"
expect "$ "

puts "=========================================="
puts "GPU 드라이버 확인 완료!"
puts "=========================================="

send "exit\r"
expect eof

