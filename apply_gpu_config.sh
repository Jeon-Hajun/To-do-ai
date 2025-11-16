#!/usr/bin/expect -f

set timeout 60
set SSH_HOST "webdev@220.69.240.143"
set SSH_PORT "22001"
set SSH_PASSWORD "webroqkfwk2025"
set PROJECT_DIR "/Users/rona/workspace/to-do-ai"

spawn scp -P $SSH_PORT $PROJECT_DIR/ollama.service.gpu $SSH_HOST:/tmp/ollama.service.gpu

expect {
    "password:" {
        send "$SSH_PASSWORD\r"
        exp_continue
    }
    "$ " {
        puts "파일 전송 완료!"
    }
}

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

# 서비스 파일 백업 및 교체
send "echo $SSH_PASSWORD | sudo -S cp /etc/systemd/system/ollama.service /etc/systemd/system/ollama.service.bak\r"
expect "$ "

send "echo $SSH_PASSWORD | sudo -S cp /tmp/ollama.service.gpu /etc/systemd/system/ollama.service\r"
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

# 서비스 상태 확인
send "echo $SSH_PASSWORD | sudo -S systemctl status ollama.service | head -15\r"
expect "$ "

# Ollama 프로세스 확인
send "ps aux | grep 'ollama serve' | grep -v grep\r"
expect "$ "

puts "=========================================="
puts "GPU 설정 적용 완료!"
puts "=========================================="

send "exit\r"
expect eof

