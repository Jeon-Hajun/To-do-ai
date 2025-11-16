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
puts "최신 코드 가져오기"
puts "=========================================="

send "cd $PROJECT_DIR && git pull origin main\r"
expect "$ "

puts "=========================================="
puts "기존 프로세스 종료"
puts "=========================================="

send "pkill -f 'python.*app.py' || echo 'AI 백엔드 프로세스 없음'\r"
expect "$ "

send "pkill -f 'node.*www' || echo 'Node.js 백엔드 프로세스 없음'\r"
expect "$ "

send "sleep 2\r"
expect "$ "

puts "=========================================="
puts "AI 백엔드 재시작"
puts "=========================================="

send "cd $PROJECT_DIR/ai-backend && source venv/bin/activate && nohup python app.py > ai-backend.log 2>&1 &\r"
expect "$ "

send "sleep 3\r"
expect "$ "

send "ps aux | grep 'python.*app.py' | grep -v grep || echo 'AI 백엔드 시작 실패'\r"
expect "$ "

puts "=========================================="
puts "Node.js 백엔드 재시작"
puts "=========================================="

send "cd $PROJECT_DIR/backend && nohup npm start > ../backend.log 2>&1 &\r"
expect "$ "

send "sleep 3\r"
expect "$ "

send "ps aux | grep 'node.*www' | grep -v grep || echo 'Node.js 백엔드 시작 실패'\r"
expect "$ "

puts "=========================================="
puts "포트 확인"
puts "=========================================="

send "netstat -tlnp | grep -E ':(3001|5001)' || ss -tlnp | grep -E ':(3001|5001)'\r"
expect "$ "

puts "=========================================="
puts "서버 재시작 완료!"
puts "=========================================="

send "exit\r"
expect eof

