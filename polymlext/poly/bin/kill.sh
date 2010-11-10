#!/usr/bin/env bash
# This is process id, parameter passed by user
ppid=$1
ps -o pid= --ppid $ppid | xargs kill -2 >/dev/null
