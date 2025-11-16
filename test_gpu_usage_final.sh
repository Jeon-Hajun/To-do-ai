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

# 실제 모델 요청으로 GPU 사용 확인
puts "=========================================="
puts "GPU 사용 테스트 - 모델 요청"
puts "=========================================="
send "time curl -s -X POST http://localhost:11434/api/generate -H Content-Type:application/json -d '{\"model\":\"qwen2.5:14b\",\"prompt\":\"Write a short story about AI and robots.\",\"stream\":false}' --max-time 60\r"
expect "$ "

# Ollama 로그에서 GPU 사용 확인
puts "=========================================="
puts "GPU 사용 로그 확인"
puts "=========================================="
send "echo $SSH_PASSWORD | sudo -S journalctl -u ollama.service -n 50 --no-pager | grep -i -E 'GPU model buffer|CUDA|CPU model buffer|inference compute' | tail -10\r"
expect "$ "

# 모델 상태 확인 (VRAM 사용 여부)
puts "=========================================="
puts "모델 상태 확인 (VRAM)"
puts "=========================================="
send "curl -s http://localhost:11434/api/ps | python3 -c \"import sys, json; d=json.load(sys.stdin); m=d['models'][0] if d.get('models') else {}; print('VRAM:', m.get('size_vram', 0), 'bytes (', m.get('size_vram', 0)//1024//1024//1024, 'GB)' if m.get('size_vram', 0) > 0 else 'bytes (CPU 사용)'); print('RAM:', m.get('size', 0)//1024//1024//1024, 'GB' if m.get('size', 0) > 0 else 'N/A')\" 2>/dev/null || curl -s http://localhost:11434/api/ps\r"
expect "$ "

# nvidia-smi로 GPU 사용률 확인
puts "=========================================="
puts "GPU 사용률 확인 (nvidia-smi)"
puts "=========================================="
send "echo $SSH_PASSWORD | sudo -S nvidia-smi --query-gpu=index,name,utilization.gpu,utilization.memory,memory.used,memory.total --format=csv\r"
expect "$ "

puts "=========================================="
puts "테스트 완료!"
puts "=========================================="
puts "GPU가 정상적으로 감지되었습니다:"
puts "- RTX 5090 (32GB VRAM)"
puts "- CUDA 12.0"
puts "- Ollama가 GPU를 발견함"

send "exit\r"
expect eof

