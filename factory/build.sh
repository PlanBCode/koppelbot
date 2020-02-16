#!/bin/sh
SCRIPTDIR=$(dirname "$0")
XYZ_HOME=$(cd "$SCRIPTDIR/.." && pwd)
WEBPACK="$XYZ_HOME/factory/js/node_modules/webpack/bin/webpack.js"

"$WEBPACK" --config "$XYZ_HOME/factory/js/conf/webpack.conf.js" --mode development