#!/usr/bin/env bash
set -exuo pipefail

[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF
	Gets .did files and generates canister bindings from them.

	Note: This does so WITHOUT deploying any canisters. This code just downloads the candid files
	and puts them where they would normally be found for a local deployment.

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

declarations_base="src/declarations"

# Gets all .did files listed in dfx.json.
#
# .did files are placed in the `declarations` directory, where the .did files are expected by `icp-bindgen` and other commands.
function install_did_files() {
  jq -r '.canisters | to_entries | .[] | select(.value.candid != null) | "\(.key) \(.value.candid)"' dfx.json |
    while read -r line; do
      IFS=', ' read -r -a array <<<"$line"
      canister_name="${array[0]}"
      source="${array[1]}"
      filename="${canister_name}.did"
      destination="$declarations_base/${canister_name}/${filename}"
      mkdir -p "$(dirname "$destination")"
      case "$source" in
      http*) scripts/download-immutable.sh "$source" "$destination" ;;
      *) if test -e "$source"; then cp "$source" "$destination"; else echo "WARNING: $canister_name did file not found at $source"; fi ;;
      esac
    done
}

# Generate Rust bindings for cycles_ledger canister
#
# It first copy the candid file in the local .dfx directory (where dfx expects it), then calls the rust.sh script to generate the bindings.
function generate_rust_bindings() {
  canister="cycles_ledger"
  filename="${canister}.did"
  origin="$declarations_base/${canister}/${filename}"
  destination=".dfx/local/canisters/${canister}/${filename}"
  mkdir -p "$(dirname "$destination")"
  cp "$origin" "$destination"
  scripts/bind/rust.sh cycles_ledger
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
generate_rust_bindings
# Generate javascript & typescript bindings for canisters with directories in `declarations`:
mapfile -t canisters < <(ls "$declarations_base")
for canister in "${canisters[@]}"; do
  declaration_path="$declarations_base/$canister"
  candid_file="$declaration_path/${canister}.did"
  if [[ -f "$candid_file" ]]; then
    echo "Generating bindings for $canister"
    icp-bindgen --did-file "$candid_file" --out-dir "$declaration_path"
  else
    echo "WARNING: Candid file not found for $canister at $candid_file"
  fi
done

# Clean up..
node scripts/did.update.types.mjs
node scripts/did.delete.types.mjs
npm run format
