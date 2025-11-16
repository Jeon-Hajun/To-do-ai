#!/usr/bin/expect -f

set timeout 30
set host "220.69.240.143"
set port "22001"
set user "webdev"
set password "webroqkfwk2025"

# 프로젝트 디렉토리로 이동하고 git pull
spawn ssh -p $port $user@$host "cd /home/webdev/AutoPM/To-do-ai && git pull origin main"

expect {
    "password:" {
        send "$password\r"
        exp_continue
    }
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    eof
}



