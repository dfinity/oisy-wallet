#!/bin/sh

if [ "$1" = "--remove-files" ]; then
  node ./scripts/check.unused.svelte.mjs --remove-files
else
  node ./scripts/check.unused.svelte.mjs
fi
