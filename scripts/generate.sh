#!/usr/bin/env bash
set -euo pipefail

[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF
	Gets .did files and generates canister bindings from them.

	Note: This does so WITHOUT deploying any canisters.  Typically "dfx generate"
	requires all the canisters to be deployed locally, which seems absurdly heavyweight.
	This code just downloads the candid files and puts them where they would normally
	be found for a local deployment.  Much faster!

	Dependencies:
	- Please install jq before running this script.
	EOF
  exit 0
}

# Check that jq is installed.
command -v jq &>/dev/null || {
  echo "ERROR: Please install jq before running this command."
  exit 1
} >&2

# Gets all .did files listed in dfx.json.
#
# .did files are placed in the local .dfx directory, where the .did files are expected by `dfx generate` and other commands.
function install_did_files() {
  jq -r '.canisters | to_entries | .[] | select(.value.candid != null) | "\(.key) \(.value.candid)"' dfx.json |
    while read -r line; do
      IFS=', ' read -r -a array <<<"$line"
      canister_name="${array[0]}"
      source="${array[1]}"
      filename="${source##*/}"
      destination=".dfx/local/canisters/${array[0]}/${filename}"
      mkdir -p "$(dirname "$destination")"
      case "$source" in
      http*) curl -sSL "$source" >"$destination" ;;
      *) if test -e "$source"; then cp "$source" "$destination"; else echo "WARNING: $canister_name did file not found at $source"; fi ;;
      esac
    done
}

# Create local .did files
./scripts/did.sh
# Download .did files listed in dfx.json
install_did_files
# Generate bindings for canisters with directories in `declarations`:
for canister in $(ls src/declarations/); do
  echo "Generating bindings for $canister"
  dfx generate "$canister"
done
# Clean up..
node scripts/did.update.types.mjs
node scripts/did.delete.types.mjs
npm run format
