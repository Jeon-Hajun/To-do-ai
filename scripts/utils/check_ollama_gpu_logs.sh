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

# Ollama 로그에서 GPU 관련 메시지 확인 (sudo 사용)
puts "Ollama GPU 로그 확인 중..."
send "echo $SSH_PASSWORD | sudo -S journalctl -u ollama.service -n 100 --no-pager | grep -i -E 'gpu|cuda|device|nvidia' || echo GPU_관련_로그_없음\r"
expect "$ "

# 전체 Ollama 로그 확인 (최근 50줄)
send "echo $SSH_PASSWORD | sudo -S journalctl -u ollama.service -n 50 --no-pager | tail -30\r"
expect "$ "

# GPU 디바이스 사용 확인
send "echo $SSH_PASSWORD | sudo -S lsof /dev/nvidia0 2>/dev/null | head -10 || echo GPU_디바이스_사용_프로세스_없음\r"
expect "$ "

# nvidia-smi로 GPU 상태 확인 (sudo)
send "echo $SSH_PASSWORD | sudo -S nvidia-smi 2>&1 | head -20\r"
expect "$ "

# Ollama 프로세스의 환경변수 확인
send "ps eww -p \$(pgrep -f 'ollama serve' | head -1) 2>/dev/null | grep -i cuda || echo CUDA_환경변수_없음\r"
expect "$ "

puts "=========================================="
puts "GPU 로그 확인 완료!"
puts "=========================================="

send "exit\r"
expect eof

