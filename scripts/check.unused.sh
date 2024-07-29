#!/bin/sh

if [ "$1" = "--remove-files" ]; then
  node ./scripts/check.unused.mjs --remove-files
else
  node ./scripts/check.unused.mjs
fi
