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

# Ollama가 GPU를 감지하는지 확인
puts "Ollama GPU 감지 확인 중..."
send "curl -s http://localhost:11434/api/ps\r"
expect "$ "

# Ollama 환경변수 확인
send "curl -s http://localhost:11434/api/show -d '{\"name\":\"qwen2.5:14b\"}' | python3 -m json.tool 2>/dev/null | grep -i gpu || curl -s http://localhost:11434/api/show -d '{\"name\":\"qwen2.5:14b\"}' | head -30\r"
expect "$ "

# 실제 모델 실행 시 GPU 사용 확인 (더 긴 프롬프트로)
puts "긴 프롬프트로 GPU 사용 테스트 중..."
send "time curl -s -X POST http://localhost:11434/api/generate -H 'Content-Type: application/json' -d '{\"model\":\"qwen2.5:14b\",\"prompt\":\"Write a short story about a robot.\",\"stream\":false}' --max-time 60 2>&1 | python3 -c \"import sys, json; d=json.load(sys.stdin); print(f'총시간: {d.get(\\\"total_duration\\\",0)/1e9:.2f}초, 평가시간: {d.get(\\\"eval_duration\\\",0)/1e9:.2f}초')\" 2>/dev/null || echo 시간_측정_실패\r"
expect "$ "

# 프로세스의 GPU 사용 확인 (다른 방법)
send "ps aux | grep 'ollama runner' | grep -v grep\r"
expect "$ "

# /proc에서 GPU 사용 확인
send "lsof /dev/nvidia0 2>/dev/null | head -5 || echo GPU_디바이스_사용_프로세스_없음\r"
expect "$ "

puts "=========================================="
puts "GPU 확인 완료!"
puts "=========================================="

send "exit\r"
expect eof

