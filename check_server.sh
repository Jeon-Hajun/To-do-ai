#!/usr/bin/expect -f

set timeout 30
set host "220.69.240.143"
set port "22001"
set user "webdev"
set password "webroqkfwk2025"

# 명령어를 인자로 받기
set command [join $argv " "]

# 원격 명령어 실행
spawn ssh -p $port $user@$host $command

expect {
    "password:" {
        send "$password\r"
        exp_continue
    }
    "yes/no" {
        send "yes\r"
        exp_continue
    }
    timeout {
        send_user "SSH 접속 타임아웃\n"
        exit 1
    }
}

expect {
    eof {
        # 정상 종료
    }
    timeout {
        # 타임아웃 시에도 종료
    }
}

