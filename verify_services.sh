#!/usr/bin/expect -f

set timeout 30
set SSH_HOST "webdev@220.69.240.143"
set SSH_PORT "22001"
set SSH_PASSWORD "webroqkfwk2025"
set PROJECT_DIR "/home/webdev/AutoPM/To-do-ai"

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

puts "=========================================="
puts "서비스 상태 확인"
puts "=========================================="

send "echo '=== Ollama ==='\r"
expect "$ "
send "echo $SSH_PASSWORD | sudo -S systemctl is-active ollama.service\r"
expect "$ "

send "echo '=== MySQL ==='\r"
expect "$ "
send "echo $SSH_PASSWORD | sudo -S systemctl is-active mysql.service\r"
expect "$ "

send "echo '=== Node.js 백엔드 ==='\r"
expect "$ "
send "ps aux | grep 'node.*www' | grep -v grep || echo 없음\r"
expect "$ "

send "echo '=== Python AI 백엔드 ==='\r"
expect "$ "
send "ps aux | grep 'python.*app.py' | grep -v grep || echo 없음\r"
expect "$ "

send "echo '=== React 프론트엔드 ==='\r"
expect "$ "
send "ps aux | grep 'react-scripts\|node.*react' | grep -v grep || echo 없음\r"
expect "$ "

send "cd $PROJECT_DIR/morpheus-react/web && tail -10 react.log 2>/dev/null || echo 로그_없음\r"
expect "$ "

puts "=========================================="
puts "확인 완료!"
puts "=========================================="

send "exit\r"
expect eof

