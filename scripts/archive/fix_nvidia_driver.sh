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

# NVIDIA 드라이버 모듈 확인
puts "NVIDIA 드라이버 모듈 확인 중..."
send "echo $SSH_PASSWORD | sudo -S lsmod | grep nvidia\r"
expect "$ "

# NVIDIA 디바이스 확인
send "echo $SSH_PASSWORD | sudo -S ls -la /dev/nvidia* 2>/dev/null | head -5 || echo NVIDIA_디바이스_없음\r"
expect "$ "

# NVIDIA 드라이버 버전 확인
send "echo $SSH_PASSWORD | sudo -S cat /proc/driver/nvidia/version 2>/dev/null || echo 드라이버_버전_확인_실패\r"
expect "$ "

# nvidia-smi 직접 실행 (경로 확인)
send "which nvidia-smi || echo nvidia-smi_없음\r"
expect "$ "

# NVIDIA 드라이버 재로드 시도
puts "NVIDIA 드라이버 모듈 재로드 시도 중..."
send "echo $SSH_PASSWORD | sudo -S modprobe -r nvidia_uvm 2>&1 || echo 모듈_제거_실패\r"
expect "$ "

send "echo $SSH_PASSWORD | sudo -S modprobe -r nvidia 2>&1 || echo 모듈_제거_실패\r"
expect "$ "

send "sleep 2\r"
expect "$ "

send "echo $SSH_PASSWORD | sudo -S modprobe nvidia 2>&1\r"
expect "$ "

send "echo $SSH_PASSWORD | sudo -S modprobe nvidia_uvm 2>&1\r"
expect "$ "

send "sleep 2\r"
expect "$ "

# nvidia-smi 다시 확인
send "echo $SSH_PASSWORD | sudo -S nvidia-smi 2>&1 | head -15\r"
expect "$ "

# Ollama 서비스 재시작
puts "Ollama 서비스 재시작 중..."
send "echo $SSH_PASSWORD | sudo -S systemctl restart ollama.service\r"
expect "$ "

send "sleep 5\r"
expect "$ "

# Ollama 로그에서 GPU 감지 확인
send "echo $SSH_PASSWORD | sudo -S journalctl -u ollama.service -n 30 --no-pager | grep -i -E 'gpu|cuda|device|nvidia|CPU model buffer' | head -10\r"
expect "$ "

puts "=========================================="
puts "드라이버 재로드 완료!"
puts "=========================================="

send "exit\r"
expect eof

