#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"

print_help() {
  cat <<-EOF

	Provisions (or rotates) the OnRamper widget signing secret on the backend canister.

	The secret is held only in canister state and used by 'sign_onramper_widget_url' to sign
	OnRamper widget URLs — it never reaches the frontend bundle. Until it is set, the buy widget
	reports itself unavailable (see 'onramper_enabled').

	This calls the dedicated 'set_onramper_signing_secret' endpoint, which mutates a single field
	and therefore does NOT clobber the other configured API keys (e.g. the CoinGecko key), unlike
	a raw 'set_api_keys' call. Controller identity required.

	The secret is read from (in order of precedence):
	  1) the --secret flag (avoid on shared machines: it lands in shell history)
	  2) the ONRAMPER_SIGNING_SECRET environment variable
	  3) an interactive, non-echoed prompt

	Examples:
	  ONRAMPER_SIGNING_SECRET=sk_... ./scripts/provision-onramper-signing-secret.sh --network ic
	  ./scripts/provision-onramper-signing-secret.sh --network staging   # prompts for the secret

	To clear the secret (disable the widget): pass --clear.
	EOF
}

# Source the clap.bash file ---------------------------------------------------
source "$SOURCE_DIR/clap.bash"
# Define options
clap.define short=n long=network desc="dfx network to use" variable=NETWORK default="local"
clap.define short=s long=secret desc="OnRamper signing secret (prefer env var / prompt)" variable=SECRET default=""
clap.define short=i long=identity desc="dfx identity to call with (must be a controller)" variable=IDENTITY default="default"
clap.define short=c long=clear desc="Clear the secret instead of setting it" variable=CLEAR default="false" nargs=0
# Source the output file ----------------------------------------------------------
# `SECRET` is a common env-var name and clap only seeds variables with a non-empty default, so
# without this an inherited/exported $SECRET would leak in and bypass the documented precedence
# (--secret flag → ONRAMPER_SIGNING_SECRET → prompt). Unset it so only --secret can set it.
unset SECRET
source "$(clap.build)"

if [[ "$CLEAR" == "true" ]]; then
  echo "Clearing the OnRamper signing secret on network '$NETWORK'..."
  dfx canister call --identity "$IDENTITY" --network "$NETWORK" backend set_onramper_signing_secret '(null)'
else
  # clap only initializes variables with a non-empty default, so under `set -u` an unset
  # --secret leaves $SECRET unbound; guard the read so the env-var / prompt fallbacks work.
  if [[ -z "${SECRET:-}" ]]; then
    SECRET="${ONRAMPER_SIGNING_SECRET:-}"
  fi
  if [[ -z "$SECRET" ]]; then
    # `|| true` so EOF (e.g. empty stdin) doesn't abort under `set -e` before the check below.
    read -rs -p "OnRamper signing secret: " SECRET || true
    echo
  fi
  [[ -n "$SECRET" ]] || {
    echo "ERROR: no secret provided." >&2
    print_help
    exit 1
  }

  # Escape backslashes and double quotes for the Candid string literal.
  ESCAPED="${SECRET//\\/\\\\}"
  ESCAPED="${ESCAPED//\"/\\\"}"

  echo "Setting the OnRamper signing secret on network '$NETWORK'..."
  dfx canister call --identity "$IDENTITY" --network "$NETWORK" backend set_onramper_signing_secret "(opt \"$ESCAPED\")"
fi

echo -n "onramper_enabled now reports: "
dfx canister call --identity "$IDENTITY" --network "$NETWORK" backend onramper_enabled
