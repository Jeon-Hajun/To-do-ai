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

# 백엔드 프로세스 확인
send "ps aux | grep -E 'node.*bin/www|node.*app.js' | grep -v grep\r"
expect "$ "

# AI 백엔드 프로세스 확인
send "ps aux | grep -E 'python.*app.py|flask' | grep -v grep\r"
expect "$ "

# 포트 확인
send "netstat -tlnp | grep -E ':3001|:5001' || ss -tlnp | grep -E ':3001|:5001'\r"
expect "$ "

# 백엔드 로그 확인
send "tail -30 $PROJECT_DIR/backend/backend.log 2>/dev/null || echo '백엔드 로그 없음'\r"
expect "$ "

# AI 백엔드 로그 확인
send "tail -30 $PROJECT_DIR/ai-backend/ai-backend.log 2>/dev/null || echo 'AI 백엔드 로그 없음'\r"
expect "$ "

# AI 백엔드 헬스체크
send "curl -s http://localhost:5001/health || echo 'AI 백엔드 연결 실패'\r"
expect "$ "

# 백엔드에서 AI 백엔드 연결 테스트
send "curl -s http://localhost:3001/api/test || echo '백엔드 연결 실패'\r"
expect "$ "

puts "=========================================="
puts "상태 확인 완료!"
puts "=========================================="

send "exit\r"
expect eof

