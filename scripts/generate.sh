#!/usr/bin/env bash
set -exuo pipefail

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
      filename="${filename//-/_}" # dfx uses underscores rather than hyphens
      destination=".dfx/local/canisters/${array[0]}/${filename}"
      mkdir -p "$(dirname "$destination")"
      case "$source" in
      http*) scripts/download-immutable.sh "$source" "$destination" ;;
      *) if test -e "$source"; then cp "$source" "$destination"; else echo "WARNING: $canister_name did file not found at $source"; fi ;;
      esac
    done
}

# Create local .did files
# .. gets candid from Rust code
./scripts/did.sh
# .. downloads candid for the signer
DFX_NETWORK=ic ./scripts/build.signer.sh
# .. downloads candid for the kong_backend
DFX_NETWORK=ic ./scripts/build.kong_backend.sh
# .. downloads candid for the icp_swap_pool
DFX_NETWORK=ic ./scripts/build.icp_swap_pool.sh
# .. downloads candid for the icp_swap_factory
DFX_NETWORK=ic ./scripts/build.icp_swap_factory.sh
# .. downloads candid for the xtc_ledger
DFX_NETWORK=ic ./scripts/build.xtc_ledger.sh
# .. downloads candid for the sol_rpc
DFX_NETWORK=ic ./scripts/build.sol_rpc.sh
# .. downloads candid for the llm
DFX_NETWORK=ic ./scripts/build.llm.sh
# Download .did files listed in dfx.json
install_did_files
# Generate Rust bindings
scripts/bind/rust.sh cycles_ledger
# Generate javascript & typescript bindings for canisters with directories in `declarations`:
mapfile -t canisters < <(ls src/declarations/)
for canister in "${canisters[@]}"; do
  echo "Generating bindings for $canister"
  dfx generate "$canister"
done
# Clean up..
node scripts/did.update.types.mjs
node scripts/did.delete.types.mjs
npm run format
