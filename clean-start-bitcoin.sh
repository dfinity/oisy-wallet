#!/usr/bin/env bash
set -o errexit
set -o pipefail
set -o nounset

BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
OISY_WALLET_DIR="$( cd "${BASE_DIR}/../frontend/oisy-wallet" && pwd )"

source ${BASE_DIR}/dfx-helper.sh
echo "BASE_DIR=${BASE_DIR}"
cd ${OISY_WALLET_DIR}

switch_identity "${LOCAL_DEFAULT_IDENTITY_NAME}"

# Function to display an error message and exit
error_exit() {
  echo "Error: $1"
  exit 1
}


clean_files() {
	rm -rf ./.dfx
	rm -rf ./out
	
	rm -rf ./in;
	# rm -rf ./build;
	rm -rf ./target;
	
	${OISY_WALLET_DIR}/scripts/setup.bitcoin-node.sh --reset
}

ensure_dfx_is_down() {
  echo "Making sure no other dfx process is currently running locally"
  dfx stop
  sleep 17
  dfx killall
  sleep 5
}

ensure_bitcoind_is_down() {
 echo "Checking for any running 'bitcoind' processes in regtest mode..."

  # Find and stop the running Bitcoin node in regtest mode
  local BITCOIND_PID=""
  BITCOIND_PID=$(pgrep -f "bitcoind.*" || true) # Prevent script exit on pgrep failure

  if [ -n "$BITCOIND_PID" ]; then
    echo "Found running 'bitcoind' process (PID: $BITCOIND_PID). Stopping it..."
    kill "$BITCOIND_PID" || error_exit "Failed to stop 'bitcoind' (PID: $BITCOIND_PID). You may need to stop it manually."
    sleep 5

    # Ensure the process is completely stopped
    if pgrep -f "bitcoind.*-regtest" >/dev/null; then
      error_exit "'bitcoind' process could not be stopped. Please stop it manually."
    fi

    echo "'bitcoind' stopped successfully."
  else
    echo "No running 'bitcoind' process found in regtest mode."
  fi
}

start_bitcoind_node() {
  echo "Starting the Bitcoin node in regtest mode using nohup..."

  # Run the setup script in the background
  nohup ./scripts/setup.bitcoin-node.sh > ${SCRIPTS_LOG_DIR}/bitcoin-node.log 2>&1 &
  
  echo "bitcoin node started"
  
  sleep 10 # Give it some time to initialize

  # Validate if the Bitcoin node is running
  if ! pgrep -f "bitcoind.*" >/dev/null; then
    error_exit "Bitcoin node failed to start. Check logs: ${SCRIPTS_LOG_DIR}/bitcoin-node.log"
  fi

  echo "Bitcoin node started successfully (logs: ${SCRIPTS_LOG_DIR}/bitcoin-node.log)."
}

check_environment() {
  echo "Checking environment configuration..."

  # Ensure the .env.development file exists
  if [ ! -f .env.development ]; then
    error_exit "File '.env.development' is missing. Please create it and ensure it includes 'VITE_BITCOIN_MAINNET_DISABLED=false'."
  fi

  # Check if the variable is set correctly
  ENV_VAR_VALUE=$(grep "^VITE_BITCOIN_MAINNET_DISABLED" .env.development | cut -d '=' -f2)

  if [ "$ENV_VAR_VALUE" != "false" ]; then
    error_exit "Environment variable 'VITE_BITCOIN_MAINNET_DISABLED' is not set to 'false' in '.env.development'. \
Please set it correctly: VITE_BITCOIN_MAINNET_DISABLED=false"
  fi

  echo "Environment check passed: VITE_BITCOIN_MAINNET_DISABLED=false"
}


start_dfx_with_bitcoin() {
  echo "Starting dfx with Bitcoin support in the background..."
  
  # Clean state and start dfx in the background
  nohup ./scripts/dfx.start-with-bitcoin.sh --clean > ${SCRIPTS_LOG_DIR}/dfx-start.log 2>&1 &
  sleep 15
  
  # Optionally check if dfx started successfully
  if ! pgrep -f 'dfx' >/dev/null; then
    error_exit "dfx did not start successfully. Check logs: ${SCRIPTS_LOG_DIR}/dfx-start.log"
  fi
  
  echo "dfx started successfully with Bitcoin support (logs: ${SCRIPTS_LOG_DIR}/dfx-start.log)."
}

deploy_bitcoin_canister() {
  echo "Deploying the Bitcoin canister..."
  # Deploy the Bitcoin canister using dfx
  dfx deploy --no-wallet bitcoin --argument "(record {
  stability_threshold = opt 1;
  network = opt variant { regtest };
})" > "${SCRIPTS_LOG_DIR}/bitcoin-canister.log" 2>&1 || \
    error_exit "Failed to deploy the Bitcoin canister. Check logs: ${SCRIPTS_LOG_DIR}/bitcoin-canister.log"

  echo "Bitcoin canister deployed successfully."
}

# Main Program Execution
main() {
  echo "Installing bitcoin environment in a local ICP environment"
  check_environment
  
  ensure_dfx_is_down
  ensure_bitcoind_is_down
  
  clean_files
  
  start_bitcoind_node
  start_dfx_with_bitcoin
  
  deploy_bitcoin_canister
}


main




#"bitcoin": {
#"type": "custom",
#"candid": "https://raw.githubusercontent.com/dfinity/bitcoin-canister/refs/tags/release/2024-08-30/can§ister/candid.did",
#"wasm": "https://github.com/dfinity/bitcoin-canister/releases/download/release%2F2024-08-30/ic-btc-canister.wasm.gz",
#"specified_id": "ghsi2-tqaaa-aaaan-aaaca-cai",
#"remote": {
#	"id": {
#		"ic": "n5wcd-faaaa-aaaar-qaaea-cai",
#		"test_be_1": "ghsi2-tqaaa-aaaan-aaaca-cai",
#		"test_fe_1": "ghsi2-tqaaa-aaaan-aaaca-cai",
#		"test_fe_2": "ghsi2-tqaaa-aaaan-aaaca-cai",
#		"test_fe_3": "ghsi2-tqaaa-aaaan-aaaca-cai",
#		"test_fe_4": "ghsi2-tqaaa-aaaan-aaaca-cai",
#		"test_fe_5": "ghsi2-tqaaa-aaaan-aaaca-cai",
#		"test_fe_6": "ghsi2-tqaaa-aaaan-aaaca-cai",
#		"audit": "ghsi2-tqaaa-aaaan-aaaca-cai",
#		"staging": "ghsi2-tqaaa-aaaan-aaaca-cai",
#		"e2e": "ghsi2-tqaaa-aaaan-aaaca-cai"
#		}
#	}
#},


