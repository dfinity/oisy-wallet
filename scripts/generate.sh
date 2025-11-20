#!/usr/bin/env bash
set -exuo pipefail

[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF
	Gets .did files and generates canister bindings from them.

	Note: This does so WITHOUT deploying any canisters.  Typically "dfx generate"
	requires all the canisters to be deployed locally, which seems absurdly heavyweight.
	This code just downloads the candid files of the canisters not developed in the repository
	and puts them where they would normally be found for a local deployment.  Much faster!

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
# .. downloads candid for the gkdt_stake
DFX_NETWORK=ic ./scripts/build.gldt_stake.sh
# .. downloads candid for the ext_v2_token
DFX_NETWORK=ic ./scripts/build.ext_v2_token.sh
# Download .did files listed in dfx.json
install_did_files
# Generate Rust bindings
scripts/bind/rust.sh cycles_ledger
# Generate javascript & typescript bindings for canisters with directories in `declarations`:
mapfile -t canisters < <(ls src/declarations/)

generate_declarations() {
  local canister="$1"

  echo "Generating bindings for $canister"

  local didfile=".dfx/local/canisters/${canister}/${canister}.did"
  local didfolder="src/declarations/${canister}"

  local generatedFolder="${didfolder}/declarations"
  local generatedTsfile="${generatedFolder}/${canister}.did.d.ts"
  local generatedJsfile="${generatedFolder}/${canister}.did.js"

  if [ -f "$didfile" ]; then
    mkdir -p "$didfolder"

    # --actor-disabled: skip generating actor files, since we handle those ourselves
    # --force: overwrite files. Required; otherwise, icp-bindgen would delete files at preprocess,
    # which causes issues when multiple .did files are located in the same folder.
    npx icp-bindgen --did-file "${didfile}" --out-dir "${didfolder}" --actor-disabled --force

    # icp-bindgen generates the files in a `declarations` subfolder
    # using a different suffix for JavaScript as the one we used to use.
    # That's why we have to post-process the results.
    # TODO: change back `cp` to `mv` once we adapt all imports to the new "old" location.
    cp "${generatedTsfile}" "${didfolder}"
    cp "${generatedJsfile}" "${didfolder}"
    # TODO: re-remove the generated folder once we adapt all imports to the new "old" location.
    # rm -r "${generatedFolder}"
  else
    echo "DID file skipped: $didfile"
  fi
}

for canister in "${canisters[@]}"; do
  generate_declarations "$canister"
done
# Rename factories and generate their certified counterparts.
node scripts/did.update.types.mjs
# Clean up..
node scripts/did.delete.types.mjs
npm run format
