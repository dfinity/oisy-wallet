case $ENV in
  "staging")
    PRINCIPALS=(
        "teoen-w34dv-esqk7-5gxen-m57gg-433w3-5obhr-xnkcp-ofeq3-shc75-hae"
        "y5mgz-ye6pv-bg3mu-purwq-cowuz-gkva5-hdsrv-leuqd-53hfi-kyjr4-oae"
    )
    WALLET="cvthj-wyaaa-aaaad-aaaaq-cai"
    ;;
  "ic")
    PRINCIPALS=(
        "teoen-w34dv-esqk7-5gxen-m57gg-433w3-5obhr-xnkcp-ofeq3-shc75-hae"
    )
    WALLET="yit3i-lyaaa-aaaan-qeavq-cai"
    ;;
  *)
    PRINCIPALS=(
        "dlquw-zmzmc-vttcp-cio2d-4q2to-gkete-7oqjr-o36ub-cwovd-emb7h-jae"
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