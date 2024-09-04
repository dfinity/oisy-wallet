#!/bin/bash

# Determine the OS
OS="$(uname -s)"
case "$OS" in
    Linux*)     OS_TYPE="linux";;
    Darwin*)    OS_TYPE="darwin";;
    CYGWIN*|MINGW*|MSYS*) OS_TYPE="windows";;
    *)          echo "Unsupported OS: $OS"; exit 1;;
esac

# Define variables
BITCOIN_URL="https://bitcoin.org/bin"
BITCOIN_CORE_VERSION="27.0"
BITCOIN_DIR="bitcoin-core"
BITCOIN_CONF="$BITCOIN_DIR/bitcoin.conf"
DATA_DIR="$BITCOIN_DIR/data"

# Download and set up Bitcoin Local Node
if [ ! -d $BITCOIN_DIR ]; then
    case "$OS_TYPE" in
        linux)
            echo "Downloading Bitcoin Core $BITCOIN_CORE_VERSION for Linux..."
            curl -O $BITCOIN_URL/bitcoin-core-$BITCOIN_CORE_VERSION/bitcoin-$BITCOIN_CORE_VERSION-x86_64-linux-gnu.tar.gz
            tar -xzf bitcoin-$BITCOIN_CORE_VERSION-x86_64-linux-gnu.tar.gz
            mv bitcoin-$BITCOIN_CORE_VERSION $BITCOIN_DIR
            ;;
        darwin)
            echo "Downloading Bitcoin Core $BITCOIN_CORE_VERSION for macOS..."
            curl -O $BITCOIN_URL/bitcoin-core-$BITCOIN_CORE_VERSION/bitcoin-$BITCOIN_CORE_VERSION-$(uname -m)-apple-darwin.tar.gz
            tar -xzf bitcoin-$BITCOIN_CORE_VERSION-$(uname -m)-apple-darwin.tar.gz
            mv bitcoin-$BITCOIN_CORE_VERSION $BITCOIN_DIR
            # Reference: 
            if [ "$(uname -m)" = "arm64" ]; then
                codesign -s - ./$BITCOIN_DIR/bin/bitcoind
                codesign -s - ./$BITCOIN_DIR/bin/bitcoin-cli
            fi
            ;;
        windows)
            echo "Downloading Bitcoin Core $BITCOIN_CORE_VERSION for Windows..."
            curl -O $BITCOIN_URL//bitcoin-core-$BITCOIN_CORE_VERSION/bitcoin-$BITCOIN_CORE_VERSION-win64.zip
            unzip bitcoin-$BITCOIN_CORE_VERSION-win64.zip
            mv bitcoin-$BITCOIN_CORE_VERSION $BITCOIN_DIR
            ;;
        *)
            echo "Unsupported OS type: $OS_TYPE"
            exit 1
            ;;
    esac
    # Create the data directory
    if [ ! -d "$DATA_DIR" ]; then
        echo "Creating data directory..."
        mkdir -p "$DATA_DIR"
    fi
    # Create the bitcoin.conf file
    if [ ! -f "$BITCOIN_CONF" ]; then
        echo "Creating bitcoin.conf..."
        cat <<EOL > "$BITCOIN_CONF"
# Enable regtest mode. This is required to setup a private bitcoin network.
regtest=1
# Dummy credentials that are required by \`bitcoin-cli\`.
rpcuser=ic-btc-integration
rpcpassword=QPQiNaph19FqUsCrBRN0FII7lyM26B51fAMeBQzCb-E=
rpcauth=ic-btc-integration:cdf2741387f3a12438f69092f0fdad8e\$62081498c98bee09a0dce2b30671123fa561932992ce377585e8e08bb0c11dfa
EOL
    fi
fi



# Start bitcoind with the specified configuration
echo "Starting bitcoind..."
if [ "$OS_TYPE" = "windows" ]; then
    ./$BITCOIN_DIR/bin/bitcoind.exe -conf="$(pwd)/$BITCOIN_CONF" -datadir="$(pwd)/$DATA_DIR" --port=18444
else
    ./$BITCOIN_DIR/bin/bitcoind -conf="$(pwd)/$BITCOIN_CONF" -datadir="$(pwd)/$DATA_DIR" --port=18444
fi
