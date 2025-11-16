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

# sudo 권한으로 실행
send "echo $SSH_PASSWORD | sudo -S echo sudo_권한_확인\r"
expect "$ "

# GPU 상태 확인 (sudo로)
puts "GPU 상태 확인 중..."
send "echo $SSH_PASSWORD | sudo -S nvidia-smi\r"
expect "$ "

# Ollama 서비스 중지
puts "Ollama 서비스 중지 중..."
send "echo $SSH_PASSWORD | sudo -S systemctl stop ollama.service\r"
expect "$ "

# Ollama 서비스 환경변수에 GPU 설정 추가
puts "Ollama 서비스 설정 확인 중..."
send "cat /etc/systemd/system/ollama.service\r"
expect "$ "

# CUDA 환경변수 확인
send "env | grep -i cuda || echo CUDA_환경변수_없음\r"
expect "$ "

# Ollama 서비스 재시작
puts "Ollama 서비스 재시작 중..."
send "echo $SSH_PASSWORD | sudo -S systemctl start ollama.service\r"
expect "$ "

send "sleep 3\r"
expect "$ "

# Ollama 프로세스 확인
send "ps aux | grep ollama | grep -v grep | head -3\r"
expect "$ "

# GPU 사용 확인 (nvidia-smi로)
send "echo $SSH_PASSWORD | sudo -S nvidia-smi | head -15\r"
expect "$ "

puts "=========================================="
puts "GPU 설정 완료!"
puts "=========================================="

send "exit\r"
expect eof

