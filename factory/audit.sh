#!/bin/sh
WHEREAMI="$(pwd)";

SCRIPTDIR=$(dirname "$0")
XYZ_HOME=$(cd "$SCRIPTDIR/.." && pwd)

AUDIT_MARK_FILE="$XYZ_HOME/factory/.audit.mark"

NOW=$(date +%s)

if [ -n "$1" ]; then
    AUDIT=true
elif ! [ -e "$AUDIT_MARK_FILE" ]; then
    AUDIT=true
else
    WEEK_IN_SECONDS=$((7*24*60*60))
    THRESHOLD=$(($NOW-$WEEK_IN_SECONDS))
    TIMESTAMP=$(cat "$AUDIT_MARK_FILE")
    if [ "$TIMESTAMP" -lt "$THRESHOLD" ]; then
        AUDIT=true
    fi
fi

if [ "$AUDIT" = "true" ]; then
    cd "$XYZ_HOME/factory/js"
    npm audit -fix
    echo "$NOW" > "$AUDIT_MARK_FILE"
fi

cd "$WHEREAMI"
