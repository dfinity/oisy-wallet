#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the ICRC-3 installation files:

	- The Candid file is generated from the accepted ICRC-3 spec interface.

	The files are installed at the locations defined for 'icrc3' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

ICRC3_BUILDENV="$DFX_NETWORK"
export ICRC3_BUILDENV

CANDID_FILE="$(jq -r .canisters.icrc3.candid dfx.json)"

mkdir -p "$(dirname "$CANDID_FILE")"

cat >"$CANDID_FILE" <<'EOF'
type Value = variant {
	Blob : blob;
	Text : text;
	Nat : nat;
	Int : int;
	Array : vec Value;
	Map : vec record { text; Value }
};

type GetArchivesArgs = record { from : opt principal };

type GetArchivesResult = vec record {
	canister_id : principal;
	start : nat;
	end : nat
};

type GetBlocksArgs = vec record {
	start : nat;
	length : nat
};

type GetBlocksResult = record {
	log_length : nat;
	blocks : vec record {
		id : nat;
		block : Value
	};
	archived_blocks : vec record {
		args : GetBlocksArgs;
		callback : func (GetBlocksArgs) -> (GetBlocksResult) query
	}
};

type DataCertificate = record {
	certificate : blob;
	hash_tree : blob
};

type BlockType = record {
	block_type : text;
	url : text
};

service : {
	icrc3_get_archives : (GetArchivesArgs) -> (GetArchivesResult) query;
	icrc3_get_blocks : (GetBlocksArgs) -> (GetBlocksResult) query;
	icrc3_get_tip_certificate : () -> (opt DataCertificate) query;
	icrc3_supported_block_types : () -> (vec BlockType) query
}
EOF

cat <<EOF
SUCCESS: The icrc3 installation files have been created:
icrc3 candid:       $CANDID_FILE
EOF
