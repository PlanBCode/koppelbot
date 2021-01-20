#!/bin/sh
WHEREAMI="$(pwd)";

SCRIPTDIR=$(dirname "$0")
XYZ_HOME=$(cd "$SCRIPTDIR/.." && pwd)

echo "[i] Build : start"

cd "$XYZ_HOME/factory/js" || exit 1

echo "const {build} = require('./gulp/methods'); build(()=>console.log('Done'));" | node

echo "[i] Build : stop"

cd "$WHEREAMI" || exit 0
