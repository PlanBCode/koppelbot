#!/bin/sh
SCRIPTDIR=$(dirname "$0")
XYZ_HOME=$(cd "$SCRIPTDIR/.." && pwd)

node "$XYZ_HOME/factory/js/test/test.js";