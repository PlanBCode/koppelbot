#!/bin/sh
SCRIPTDIR=$(dirname "$0")
XYZ_HOME=$(cd "$SCRIPTDIR/.." && pwd)

echo "[i] Test : start"

node "$XYZ_HOME/factory/js/test/test.js";

echo "[i] Test : done"
