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

# GPU 디바이스 권한 확인
puts "GPU 디바이스 권한 확인 중..."
send "ls -la /dev/nvidia* 2>/dev/null | head -5 || echo GPU_디바이스_없음\r"
expect "$ "

# ollama 사용자가 GPU에 접근할 수 있는지 확인
send "groups ollama || echo ollama_사용자_없음\r"
expect "$ "

# Ollama 서비스에 GPU 접근 권한 추가
puts "Ollama 서비스 설정 수정 중..."
send "echo $SSH_PASSWORD | sudo -S cp /etc/systemd/system/ollama.service /etc/systemd/system/ollama.service.bak\r"
expect "$ "

# 서비스 파일 수정 (GPU 접근을 위한 설정 추가)
send "echo $SSH_PASSWORD | sudo -S tee /etc/systemd/system/ollama.service > /dev/null << 'EOFSERVICE'
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment=\"PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin\"
Environment=\"CUDA_VISIBLE_DEVICES=0\"
# GPU 접근을 위한 디바이스 권한
DeviceAllow=/dev/nvidia0 rw
DeviceAllow=/dev/nvidiactl rw
DeviceAllow=/dev/nvidia-modeset rw
DeviceAllow=/dev/nvidia-uvm rw

[Install]
WantedBy=default.target
EOFSERVICE
\r"
expect "$ "

# systemd 재로드
send "echo $SSH_PASSWORD | sudo -S systemctl daemon-reload\r"
expect "$ "

# Ollama 서비스 재시작
puts "Ollama 서비스 재시작 중..."
send "echo $SSH_PASSWORD | sudo -S systemctl restart ollama.service\r"
expect "$ "

send "sleep 5\r"
expect "$ "

# Ollama 프로세스 확인
send "ps aux | grep 'ollama serve' | grep -v grep\r"
expect "$ "

# GPU 사용 테스트 (간단한 요청)
puts "GPU 사용 테스트 중..."
send "curl -s http://localhost:11434/api/generate -d '{\"model\":\"qwen2.5:14b\",\"prompt\":\"Hello\",\"stream\":false}' --max-time 10 2>&1 | head -3\r"
expect "$ "

# GPU 사용률 확인 (백그라운드에서)
send "echo $SSH_PASSWORD | sudo -S timeout 5 nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>/dev/null || echo GPU_사용률_확인_실패\r"
expect "$ "

puts "=========================================="
puts "GPU 설정 완료!"
puts "=========================================="

send "exit\r"
expect eof

