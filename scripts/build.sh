#!/usr/bin/env bash

if [ -n "${ENV+1}" ]; then
  npm run build:"$ENV"
else
  npm run build
fi
