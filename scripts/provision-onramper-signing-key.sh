#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"

print_help() {
  cat <<-EOF

	Sets (or replaces, or clears) the private key that signs OnRamper widget URLs with
	Signature V2 on the backend canister.

	The key is an Ed25519 private key in PKCS#8 PEM, as written by:
	  openssl genpkey -algorithm ED25519 -out private_key.pem
	Its public key (openssl pkey -in private_key.pem -pubout) is what OnRamper needs.

	While the backend holds a key, 'sign_onramper_widget_url_v2' signs with V2; without one it
	signs with V1, using the secret set by provision-onramper-signing-secret.sh.

	The key is read from the --key-file file, or else from standard input: piped, or pasted at a
	prompt that does not echo. It is never taken from the command line, and it reaches dfx through
	a pipe, so it shows up in neither the shell history nor the process list.

	Controller identity required. After setting the key, the script prints the public key the
	backend now holds: compare it with the one sent to OnRamper.

	Examples:
	  ./scripts/provision-onramper-signing-key.sh --network staging --key-file private_key.pem
	  ./scripts/provision-onramper-signing-key.sh --network staging   # prompts for the key

	To clear the key (the backend signs with V1 again): pass --clear.
	EOF
}

# Source the clap.bash file ---------------------------------------------------
source "$SOURCE_DIR/clap.bash"
# Define options
clap.define short=n long=network desc="dfx network to use" variable=NETWORK default="local"
clap.define short=f long=key-file desc="File with the private key in PKCS#8 PEM" variable=KEY_FILE default=""
clap.define short=i long=identity desc="dfx identity to call with (must be a controller)" variable=IDENTITY default="default"
clap.define short=c long=clear desc="Clear the key instead of setting it" variable=CLEAR default="false" nargs=0
# Source the output file ----------------------------------------------------------
# clap only seeds variables with a non-empty default, so an exported $KEY_FILE would otherwise leak
# in. Unset it so that only --key-file can set it.
unset KEY_FILE
source "$(clap.build)"

call_backend() {
  dfx canister call --identity "$IDENTITY" --network "$NETWORK" "$@"
}

print_public_key() {
  echo "Public key the backend now holds (null: none):"
  call_backend --query backend get_onramper_signing_public_key
}

if [[ "$CLEAR" == "true" ]]; then
  echo "Clearing the OnRamper signing key on network '$NETWORK'..."
  call_backend backend set_onramper_signing_key '(null)'
  print_public_key
  exit 0
fi

if [[ -n "${KEY_FILE:-}" ]]; then
  PEM="$(<"$KEY_FILE")"
elif [[ -t 0 ]]; then
  echo "Paste the private key (PEM), then press Ctrl-D:" >&2
  trap 'stty echo' EXIT
  stty -echo
  # `|| true` so EOF without input doesn't abort under `set -e` before the check below.
  PEM="$(cat)" || true
  stty echo
  echo >&2
else
  PEM="$(cat)"
fi

[[ "$PEM" == *"-----BEGIN PRIVATE KEY-----"* ]] || {
  echo "ERROR: no private key in PKCS#8 PEM provided." >&2
  print_help
  exit 1
}

# A Candid text literal: escape backslashes and double quotes, drop carriage returns, and write the
# line breaks as \n.
ESCAPED="${PEM//\\/\\\\}"
ESCAPED="${ESCAPED//\"/\\\"}"
ESCAPED="${ESCAPED//$'\r'/}"
ESCAPED="${ESCAPED//$'\n'/\\n}"

echo "Setting the OnRamper signing key on network '$NETWORK'..."
# `printf` is a shell builtin, so the key is not in any process's arguments.
RESULT="$(call_backend backend set_onramper_signing_key --argument-file <(printf '(opt "%s")' "$ESCAPED"))"
echo "$RESULT"
[[ "$RESULT" == *"Ok"* ]] || {
  echo "ERROR: the backend refused the key (it must be an Ed25519 private key in PKCS#8 PEM)." >&2
  exit 1
}

print_public_key
