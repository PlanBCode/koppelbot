#!/bin/sh
WHEREAMI="$(pwd)";

SCRIPTDIR=$(dirname "$0")
XYZ_HOME=$(cd "$SCRIPTDIR/.." && pwd)
WEBPACK="$XYZ_HOME/factory/js/node_modules/webpack/bin/webpack.js"

cd "$XYZ_HOME/factory/js"
"$WEBPACK" --config "$XYZ_HOME/factory/js/conf/webpack.conf.js" --mode development

cd "$WHEREAMI"
