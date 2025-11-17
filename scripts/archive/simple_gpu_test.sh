#!/usr/bin/expect -f

set timeout 90
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
puts "현재 모델 상태 확인..."
send "curl -s http://localhost:11434/api/ps\r"
expect "$ "

# 실제 모델 요청으로 GPU 사용 확인
puts "모델 요청 시작 (약 30초 소요)..."
send "time curl -s -X POST http://localhost:11434/api/generate -H Content-Type:application/json -d '{\"model\":\"qwen2.5:14b\",\"prompt\":\"Hello\",\"stream\":false}' --max-time 30\r"
expect "$ "

# Ollama 최신 로그 확인
send "echo $SSH_PASSWORD | sudo -S journalctl -u ollama.service -n 20 --no-pager | tail -15\r"
expect "$ "

puts "=========================================="
puts "테스트 완료!"
puts "=========================================="
puts "참고: 로그에서 'GPU model buffer' 또는 'CUDA'가 보이면 GPU 사용 중입니다."
puts "      'CPU model buffer'만 보이면 CPU 사용 중입니다."

send "exit\r"
expect eof

