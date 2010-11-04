#!/usr/bin/env bash
#
# This script will kill all the child process id for a  given pid
# Store the current Process ID, we don't want to kill the current executing process id
CURPID=$$

# This is process id, parameter passed by user
ppid=$1

if [ -z $ppid ] ; then
   echo No PID given.
   exit;
fi

arraycounter=1
while true
do
        FORLOOP=FALSE
        # Get all the child process id
        for i in `ps -ef| awk '$3 == '$ppid' { print $2 }'`
        do
                if [ $i -ne $CURPID ] ; then
                        procid[$arraycounter]=$i
                        arraycounter=`expr $arraycounter + 1`
                        ppid=$i
                        FORLOOP=TRUE
                fi
        done
        if [ "$FORLOOP" = "FALSE" ] ; then
           arraycounter=`expr $arraycounter - 1`
           # We want to kill child process id first and then parent id's
           while [ $arraycounter -ne 0 ]
           do
             kill -2 "${procid[$arraycounter]}" > /dev/null
             arraycounter=`expr $arraycounter - 1`
           done
         exit
        fi
done
