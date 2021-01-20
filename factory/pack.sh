#!/bin/sh
WHEREAMI="$(pwd)";

SCRIPTDIR=$(dirname "$0")
XYZ_HOME=$(cd "$SCRIPTDIR/.." && pwd)
WEBPACK="$XYZ_HOME/factory/js/node_modules/webpack/bin/webpack.js"
echo "[i] Pack : start"

cd "$XYZ_HOME/factory/js" || exit 1

"$WEBPACK" --config "$XYZ_HOME/factory/js/conf/webpack.conf.js" --mode development

echo "[i] Pack : done"

cd "$WHEREAMI" || exit 0
