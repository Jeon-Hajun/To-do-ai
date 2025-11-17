#!/usr/bin/expect -f

set timeout 60
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
puts "백엔드 코드 업데이트"
puts "=========================================="

send "cd $PROJECT_DIR && git pull origin main\r"
expect "$ "

puts "=========================================="
puts "Node.js 백엔드 재시작"
puts "=========================================="

send "pkill -f 'node.*app.js' || pkill -f 'npm.*start' || echo 프로세스_없음\r"
expect "$ "

send "sleep 2\r"
expect "$ "

send "cd $PROJECT_DIR/backend && nohup npm start > backend.log 2>&1 &\r"
expect "$ "

send "sleep 3\r"
expect "$ "

send "ps aux | grep -E 'node.*app.js|npm.*start' | grep -v grep || echo Node_프로세스_없음\r"
expect "$ "

puts "=========================================="
puts "배포 완료!"
puts "=========================================="

send "exit\r"
expect eof

