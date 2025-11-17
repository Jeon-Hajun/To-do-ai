#!/usr/bin/expect -f

set timeout 30
set host "220.69.240.143"
set port "22001"
set user "webdev"
set password "webroqkfwk2025"

spawn ssh -p $port $user@$host

expect {
    "password:" {
        send "$password\r"
        exp_continue
    }
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    "$ " {
        send_user "SSH 접속 성공!\n"
    }
    timeout {
        send_user "SSH 접속 타임아웃\n"
        exit 1
    }
}

interact



