#!/usr/bin/expect -f

set timeout 30
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

# Ollama 프로세스 확인
send "ps aux | grep ollama | grep -v grep\r"
expect "$ "

# Ollama 서비스 상태 확인
send "systemctl status ollama 2>/dev/null || echo 'systemctl 없음'\r"
expect "$ "

# Ollama 포트 확인
send "netstat -tlnp | grep 11434 || ss -tlnp | grep 11434\r"
expect "$ "

# Ollama 연결 테스트
send "curl -s http://localhost:11434/api/tags --max-time 5 || echo 'Ollama 연결 실패'\r"
expect "$ "

# Ollama가 없으면 시작 시도
send "which ollama || echo 'ollama 명령어 없음'\r"
expect "$ "

puts "=========================================="
puts "Ollama 상태 확인 완료!"
puts "=========================================="

send "exit\r"
expect eof

