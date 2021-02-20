#!/bin.sh

SCRIPTDIR=$(dirname "$0")
XYZ_HOME=$(cd "$SCRIPTDIR/../../.." && pwd)

sh "$XYZ_HOME/xyz" --help 
