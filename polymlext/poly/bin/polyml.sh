#!/usr/bin/env bash

#trap "echo \"killing\"; echo $SPAWNED_PROCESS; kill -2 $! > /dev/null; exit 0;" INT TERM EXIT
#trap "echo \"killing\"; exit 0;" TERM

HERE=$(dirname "$0")
PRG=$(basename "$0")

ISAPLIB="$HERE/../isaplib"

CUSTOM_POLYML_PATH=$5
if [ -z "$CUSTOM_POLYML_PATH" ]
then
    POLYML_HOME=$("$HERE/findpoly.sh");
else
    echo "Using custom PolyML path";
    POLYML_HOME="$CUSTOM_POLYML_PATH";
fi

THE_POLY_HEAP="polymlext.polyml-heap"
THE_POLY_PROGRAM="main.sml"

if [ "$POLYML_HOME" == "" ]
then
    echo "Can not find PolyML"; exit 3; 
else
    echo "Using PolyML: $POLYML_HOME";
fi
if [ ! -e "${POLYML_HOME}/bin/poly" ]
then
    echo "${POLYML_HOME}/bin/poly does not exist";
    exit 2;
fi

PORT1=$1
PORT2=$2
SANDBOX_PATH=$3
if [ -z "$PORT1" ] || [ -z "$PORT2" ] || [ -z "$SANDBOX_PATH" ]
then 
    echo "Usage: $PRG port1 port2 sandbox_path" >&2
    exit 2; # fail
fi

#compile the isaplib
if [ ! -e "${ISAPLIB}/heaps/all.polyml-heap" ]
then
    # compilation, based on Makefile of IsapLib
    cd "${ISAPLIB}"
    (echo 'use "ROOT.ML"; PolyML.fullGC ();
           PolyML.SaveState.saveState "heaps/all.polyml-heap";';) \
           | "${POLYML_HOME}/bin/poly" "$@";
    cd "${HERE}"
fi
LEDIT=`which cat`;
#development mode ignores the heap file
if [ "$4" == "dev" ]
then
    #compile the main.sml
    (echo "OS.FileSys.chDir(\"$HERE/../\");
           PolyML.use \"${THE_POLY_PROGRAM}\";
           val _ = PolyMLext.main($PORT1,$PORT2,\"$SANDBOX_PATH\");") \
           | "${POLYML_HOME}/bin/poly" "$@";
    # limiting memory usage of Poly --mutable 100 --immutable 200 --heap 100
else
    #build the heap if needed
    if [ ! -e "$HERE/$THE_POLY_HEAP" ]
    then
        (echo "OS.FileSys.chDir(\"$HERE/../\");
               PolyML.use \"${THE_POLY_PROGRAM}\";
               PolyML.SaveState.saveState \"bin/${THE_POLY_HEAP}\"";) \
               | "${POLYML_HOME}/bin/poly" "$@";
    fi
    #load the heap
    (echo "OS.FileSys.chDir(\"$HERE\");
           PolyML.SaveState.loadState \"${THE_POLY_HEAP}\";
           val _ = PolyMLext.main($PORT1,$PORT2,\"$SANDBOX_PATH\");";) \
           | "${POLYML_HOME}/bin/poly" "$@";
fi