#!/usr/bin/env bash

USER=z7lvn-zff37-ngtmx-6ivd2-dkwgm-7jvzc-5f4au-q6zzv-chfar-xthok-3ae
NAME=David

dfx canister call airdrop add_manager '(principal"'${USER}'", "'${NAME}'")'