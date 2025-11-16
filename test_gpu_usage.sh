#!/usr/bin/expect -f

set timeout 120
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

# GPU 사용률 모니터링 시작 (백그라운드)
puts "GPU 사용률 모니터링 시작..."
send "echo $SSH_PASSWORD | sudo -S nvidia-smi dmon -s u -c 1 2>/dev/null || echo GPU_모니터링_실패\r"
expect "$ "

# 간단한 모델 요청으로 GPU 사용 테스트
puts "GPU 사용 테스트 중 (qwen2.5:14b 모델 실행)..."
send "curl -s -X POST http://localhost:11434/api/generate -H 'Content-Type: application/json' -d '{\"model\":\"qwen2.5:14b\",\"prompt\":\"Hello, how are you?\",\"stream\":false}' --max-time 30 2>&1 | head -10\r"
expect "$ "

# GPU 사용률 확인
send "echo $SSH_PASSWORD | sudo -S nvidia-smi --query-gpu=index,name,utilization.gpu,utilization.memory,memory.used,memory.total --format=csv 2>/dev/null || echo GPU_정보_확인_실패\r"
expect "$ "

# Ollama 로그 확인 (GPU 사용 여부)
send "journalctl -u ollama.service -n 20 --no-pager | grep -i gpu || echo GPU_로그_없음\r"
expect "$ "

puts "=========================================="
puts "GPU 테스트 완료!"
puts "=========================================="

send "exit\r"
expect eof

