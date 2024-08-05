#!/usr/bin/env bash
set -euo pipefail

[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF
	Gets .did files and generates canister bindings from them.

	Note: This does so WITHOUT deploying any canisters.  Typically "dfx generate"
	requires all the canisters to be deployed locally, which seems absurdly heavyweight.
	This code just downlaods the candid files and puts them where they would normally
	be found for a local deployment.  Much faster!
	EOF
  exit 0
}

# Gets all .did files listed in dfx.json.
#
# .did files are placed in the local .dfx directory, where the .did files are expected by `dfx generate` and other commands.
function install_did_files() {
  jq -r '.canisters | to_entries | .[] | select(.value.candid != null) | "\(.key) \(.value.candid)"' dfx.json |
    while read -r line; do
      IFS=', ' read -r -a array <<<"$line"
      canister_name="${array[0]}"
      source="${array[1]}"
      destination=".dfx/local/canisters/${array[0]}/${array[0]}.did"
      mkdir -p "$(dirname "$destination")"
      case "$source" in
      http*) curl -sSL "$source" >"$destination" ;;
      *) if test -e "$source"; then cp "$source" "$destination"; else echo "WARNING: $canister_name did file not found at $source"; fi ;;
      esac
    done
}

# Create local .did files
./scripts/did.sh
# Download .did files without an explicit url in dfx.json
./scripts/download.icp.sh
./scripts/download.ckbtc.sh
./scripts/download.cketh.sh
# Generate bindings
install_did_files
# Asset storage canister .did file
mv .dfx/local/canisters/frontend/frontend.did .dfx/local/canisters/frontend/assetstorage.did
dfx generate
node scripts/did.update.types.mjs
node scripts/did.delete.types.mjs
npm run format
