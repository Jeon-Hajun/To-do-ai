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

# 프로젝트 디렉토리 찾기
send "find /home/webdev -name 'app.py' -type f 2>/dev/null | head -5\r"
expect "$ "

# 또는 git 저장소 찾기
send "find /home/webdev -name '.git' -type d 2>/dev/null | head -5\r"
expect "$ "

# 현재 실행 중인 프로세스 확인
send "ps aux | grep -E 'node|python.*app.py|flask' | grep -v grep\r"
expect "$ "

# 작업 디렉토리 확인
send "pwdx \$(pgrep -f 'python.*app.py' | head -1) 2>/dev/null || echo '프로세스 없음'\r"
expect "$ "

send "exit\r"
expect eof

