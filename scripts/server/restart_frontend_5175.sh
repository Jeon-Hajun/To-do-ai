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
puts "포트 5175 사용 중인 프로세스 확인"
puts "=========================================="

send "lsof -ti:5175 || fuser 5175/tcp 2>/dev/null || echo '포트 5175 사용 프로세스 없음'\r"
expect "$ "

send "ps aux | grep -E '5175|vite' | grep -v grep\r"
expect "$ "

puts "=========================================="
puts "포트 5175 사용 프로세스 종료"
puts "=========================================="

send "pkill -f 'vite' || echo 'Vite 프로세스 없음'\r"
expect "$ "

send "kill -9 \$(lsof -ti:5175) 2>/dev/null || echo '포트 5175 프로세스 종료 완료'\r"
expect "$ "

send "sleep 2\r"
expect "$ "

puts "=========================================="
puts "포트 5175 확인"
puts "=========================================="

send "netstat -tlnp | grep 5175 || ss -tlnp | grep 5175 || echo '포트 5175 사용 가능'\r"
expect "$ "

puts "=========================================="
puts "프론트엔드 재시작 (포트 5175)"
puts "=========================================="

send "cd $PROJECT_DIR/morpheus-react && nohup npm run dev > ../frontend.log 2>&1 &\r"
expect "$ "

send "sleep 5\r"
expect "$ "

send "ps aux | grep -E 'vite|5175' | grep -v grep\r"
expect "$ "

puts "=========================================="
puts "포트 확인"
puts "=========================================="

send "netstat -tlnp | grep 5175 || ss -tlnp | grep 5175\r"
expect "$ "

puts "=========================================="
puts "최근 로그 확인"
puts "=========================================="

send "tail -20 $PROJECT_DIR/frontend.log\r"
expect "$ "

send "exit\r"
expect eof

