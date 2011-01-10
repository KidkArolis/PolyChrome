#!/usr/bin/env bash
# This is process id, parameter passed by user
ppid=$1
ps -o pid,ppid -ax | awk "{ if (\$2 == $ppid) { print \$1 }}" | xargs kill -2 >/dev/null
