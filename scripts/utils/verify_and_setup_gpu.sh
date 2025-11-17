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

# 1. GPU 확인
puts "=========================================="
puts "1. GPU 상태 확인"
puts "=========================================="
send "echo $SSH_PASSWORD | sudo -S nvidia-smi\r"
expect "$ "

# 2. CUDA 확인
puts "=========================================="
puts "2. CUDA 설치 확인"
puts "=========================================="
send "nvcc --version 2>/dev/null || echo CUDA_컴파일러_없음\r"
expect "$ "

send "ldconfig -p | grep cuda | head -5\r"
expect "$ "

# 3. NVIDIA 드라이버 모듈 확인
puts "=========================================="
puts "3. NVIDIA 드라이버 모듈 확인"
puts "=========================================="
send "lsmod | grep nvidia\r"
expect "$ "

# 4. GPU 디바이스 확인
puts "=========================================="
puts "4. GPU 디바이스 확인"
puts "=========================================="
send "ls -la /dev/nvidia* 2>/dev/null | head -5\r"
expect "$ "

# 5. Ollama 서비스 재시작
puts "=========================================="
puts "5. Ollama 서비스 재시작"
puts "=========================================="
send "echo $SSH_PASSWORD | sudo -S systemctl restart ollama.service\r"
expect "$ "

send "sleep 5\r"
expect "$ "

# 6. Ollama 로그에서 GPU 감지 확인
puts "=========================================="
puts "6. Ollama GPU 감지 확인"
puts "=========================================="
send "echo $SSH_PASSWORD | sudo -S journalctl -u ollama.service -n 50 --no-pager | grep -i -E 'gpu|cuda|device|nvidia|discovering|found.*gpu' | head -15\r"
expect "$ "

# 7. 실제 모델 요청으로 GPU 사용 확인
puts "=========================================="
puts "7. 모델 요청으로 GPU 사용 확인"
puts "=========================================="
send "curl -s -X POST http://localhost:11434/api/generate -H Content-Type:application/json -d '{\"model\":\"qwen2.5:14b\",\"prompt\":\"test\",\"stream\":false}' --max-time 10 > /dev/null 2>&1 &\r"
expect "$ "

send "sleep 3\r"
expect "$ "

# 8. 최신 로그 확인 (GPU 사용 여부)
send "echo $SSH_PASSWORD | sudo -S journalctl -u ollama.service -n 30 --no-pager | grep -i -E 'GPU model buffer|CUDA|CPU model buffer' | head -5\r"
expect "$ "

# 9. 모델 상태 확인 (VRAM 사용 여부)
puts "=========================================="
puts "8. 모델 상태 확인 (VRAM 사용 여부)"
puts "=========================================="
send "curl -s http://localhost:11434/api/ps\r"
expect "$ "

puts "=========================================="
puts "GPU 설정 확인 완료!"
puts "=========================================="
puts "참고:"
puts "- 로그에 'GPU model buffer' 또는 'CUDA'가 보이면 GPU 사용 중"
puts "- 로그에 'CPU model buffer'만 보이면 CPU 사용 중"
puts "- api/ps 응답에서 size_vram > 0이면 GPU 사용 중"

send "exit\r"
expect eof

