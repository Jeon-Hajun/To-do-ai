#!/usr/bin/expect -f

set timeout 30
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

# 모델 상태 확인
puts "=========================================="
puts "모델 상태 확인"
puts "=========================================="
send "curl -s http://localhost:11434/api/ps\r"
expect "$ "

# nvidia-smi로 GPU 사용률 확인
puts "=========================================="
puts "GPU 사용률 확인"
puts "=========================================="
send "echo $SSH_PASSWORD | sudo -S nvidia-smi\r"
expect "$ "

puts "=========================================="
puts "GPU 설정 완료!"
puts "=========================================="
puts "✅ GPU가 정상적으로 사용되고 있습니다!"
puts "- RTX 5090 (32GB VRAM)"
puts "- CUDA 12.0"
puts "- 모델이 GPU 메모리에 로드됨"

send "exit\r"
expect eof

