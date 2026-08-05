#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the Plug helper canister installation files:

	- The Candid file is fetched from the canister itself.

	The files are installed at the locations defined for 'plug_helper' in 'dfx.json'.

	Unlike the other third-party canisters here, this interface is not published in
	any public repository, so there is no URL to download. The canister does expose
	its own interface via '__get_candid_interface_tmp_hack', which makes the
	deployed canister the only authoritative source — and fetching from it keeps
	the checked-in bindings honest about what is actually live.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

PLUG_HELPER_BUILDENV="$DFX_NETWORK"
export PLUG_HELPER_BUILDENV

CANISTER_ID="$(jq -r .canisters.plug_helper.remote.id.ic dfx.json)"
CANDID_FILE="$(jq -r .canisters.plug_helper.candid dfx.json)"

mkdir -p "$(dirname "$CANDID_FILE")"

if test -e "$CANDID_FILE"; then
  echo "Candid file already exists, keeping it: $CANDID_FILE"
else
  # dfx warns that it cannot fetch the Candid interface for this very call; that is
  # expected and harmless, so stderr is dropped. The reply is a Candid text value,
  # which `--output json` renders as a JSON string that jq can unescape faithfully —
  # doing the unescaping by hand would mangle the embedded newlines.
  DFX_WARNING=-mainnet_plaintext_identity dfx canister --network "$DFX_NETWORK" \
    call "$CANISTER_ID" __get_candid_interface_tmp_hack "()" --output json 2>/dev/null |
    jq -r . >"$CANDID_FILE"

  # A truncated or empty reply must fail the build rather than silently produce
  # bindings for an empty service.
  if ! grep -q "^service :" "$CANDID_FILE"; then
    echo "ERROR: fetched Candid does not declare a service: $CANDID_FILE" >&2
    exit 1
  fi
fi

####
# Success
cat <<EOF
SUCCESS: The plug_helper installation files have been created:
plug_helper candid:       $CANDID_FILE
EOF
