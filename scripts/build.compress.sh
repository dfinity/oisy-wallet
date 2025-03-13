#!/usr/bin/env bash

find build/ -type f -print0 | xargs -0 -I{} gzip -fnk "{}"
