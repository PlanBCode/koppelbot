#!/bin.sh

SCRIPTDIR=$(dirname "$0")
XYZ_HOME=$(cd "$SCRIPTDIR/../../.." && pwd)

echo "This utility will walk you through creating a new xyz module.
It only covers the most common items, and tries to guess sensible defaults.

Press ^C at any time to quit."

if [ -z "$1" ]; then
  read -p "module name: " NAME
else
  NAME="$1"
fi
#TODO check if already exists
#TODO not reserved: doc, map, ui, api, core, main

mkdir -p "$XYZ_HOME/custom/$NAME"

#TODO option to create landing page
mkdir -p "$XYZ_HOME/custom/$NAME/content"
echo "Hello world!" > "$XYZ_HOME/custom/$NAME/content/index.html"

#TODO version
VERSION="$(date '+%Y.%m.%d').1"
echo "{
  \"name\":\"$NAME\",
  \"version\":\"$VERSION\"
}" > "$XYZ_HOME/custom/$NAME/xyz.json"

echo "Module '$NAME' was succesfully created."
