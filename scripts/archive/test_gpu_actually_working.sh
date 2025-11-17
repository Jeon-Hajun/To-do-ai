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

# 모델 요청 전 GPU 상태 확인
puts "모델 요청 전 상태 확인..."
send "curl -s http://localhost:11434/api/ps | python3 -c \"import sys, json; d=json.load(sys.stdin); print('VRAM:', d['models'][0].get('size_vram', 0) if d.get('models') else 0)\" 2>/dev/null || echo 확인_실패\r"
expect "$ "

# 실제 모델 요청 (백그라운드)
puts "모델 요청 시작 (GPU 사용 확인)..."
send "curl -s -X POST http://localhost:11434/api/generate -H 'Content-Type: application/json' -d '{\"model\":\"qwen2.5:14b\",\"prompt\":\"Write a short story about AI.\",\"stream\":false}' --max-time 60 > /tmp/ollama_test.json 2>&1 &\r"
expect "$ "

send "sleep 3\r"
expect "$ "

# Ollama 로그에서 GPU 사용 확인
send "echo $SSH_PASSWORD | sudo -S journalctl -u ollama.service -n 50 --no-pager | grep -i -E 'gpu|cuda|device|nvidia|GPU model buffer|CUDA' | tail -10\r"
expect "$ "

# 모델 요청 완료 대기
send "wait\r"
expect "$ "

# 결과 확인
send "cat /tmp/ollama_test.json | python3 -c \"import sys, json; d=json.load(sys.stdin); print(f'총시간: {d.get(\\\"total_duration\\\",0)/1e9:.2f}초, 평가시간: {d.get(\\\"eval_duration\\\",0)/1e9:.2f}초')\" 2>/dev/null || echo 결과_확인_실패\r"
expect "$ "

# 모델 상태 확인 (VRAM 사용 여부)
send "curl -s http://localhost:11434/api/ps | python3 -c \"import sys, json; d=json.load(sys.stdin); m=d['models'][0] if d.get('models') else {}; print(f'VRAM: {m.get(\\\"size_vram\\\", 0)} bytes, RAM: {m.get(\\\"size\\\", 0)} bytes')\" 2>/dev/null || echo 상태_확인_실패\r"
expect "$ "

puts "=========================================="
puts "GPU 테스트 완료!"
puts "=========================================="

send "exit\r"
expect eof

