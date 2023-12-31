#!/usr/bin/env bash

case $ENV in
  "staging")
    PRINCIPALS=(
        "teoen-w34dv-esqk7-5gxen-m57gg-433w3-5obhr-xnkcp-ofeq3-shc75-hae"
        "y5mgz-ye6pv-bg3mu-purwq-cowuz-gkva5-hdsrv-leuqd-53hfi-kyjr4-oae"
        "moadj-5cc4w-zmzpn-pzcbv-h2miy-zimrb-uydgo-spdgq-3oceb-2tllm-rae"
        "yf2e5-4m4id-bjzhm-fsned-hvvmk-gkqpb-ljw6h-6azcu-jkud7-nlqky-bqe"
    )
    WALLET="cvthj-wyaaa-aaaad-aaaaq-cai"
    ;;
  "ic")
    PRINCIPALS=(
        "teoen-w34dv-esqk7-5gxen-m57gg-433w3-5obhr-xnkcp-ofeq3-shc75-hae"
        "moadj-5cc4w-zmzpn-pzcbv-h2miy-zimrb-uydgo-spdgq-3oceb-2tllm-rae"
        "yf2e5-4m4id-bjzhm-fsned-hvvmk-gkqpb-ljw6h-6azcu-jkud7-nlqky-bqe"
    )
    WALLET="yit3i-lyaaa-aaaan-qeavq-cai"
    ;;
  *)
    PRINCIPALS=(
        "dlquw-zmzmc-vttcp-cio2d-4q2to-gkete-7oqjr-o36ub-cwovd-emb7h-jae"
        "moadj-5cc4w-zmzpn-pzcbv-h2miy-zimrb-uydgo-spdgq-3oceb-2tllm-rae"
    )
    ;;
esac

for P in "${PRINCIPALS[@]}"; do
  if [ -n "${ENV+1}" ]; then
    dfx canister call airdrop add_admin '(principal"'$P'")' --network "$ENV" --wallet "$WALLET"
  else
    dfx canister call airdrop add_admin '(principal"'$P'")'
  fi
done
