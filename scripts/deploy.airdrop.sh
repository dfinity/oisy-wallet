DFX_PRINCIPAL=$(dfx identity get-principal)

if [ -n "${ENV+1}" ]; then
  echo "TODO: to be implemented"
else
    dfx deploy airdrop --argument '(vec {principal"'${DFX_PRINCIPAL}'"})' --mode reinstall

    dfx canister call airdrop add_codes '(vec {"AAAAA"; "BBBBB"; "CCCCC"; "DDDDDD"})'
fi