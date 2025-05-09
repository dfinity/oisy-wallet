# OISY Wallet Development on Linux

This guide provides detailed instructions for setting up and running the **OISY wallet** project on Linux distributions.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Running the Local Replica](#running-the-local-replica)
- [Deploying OISY Locally](#deploying-oisy-locally)
- [Frontend Development](#frontend-development)
- [Backend Development](#backend-development)
- [Bitcoin Development](#bitcoin-development)
- [Internationalization](#internationalization)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed on your Linux system:

- [x] **IC SDK** — <https://internetcomputer.org/docs/current/developer-docs/setup/install/index.mdx>
- [x] **Node.js** (LTS version recommended) — <https://nodejs.org/>
- [x] **Git** — <https://git-scm.com/download/linux>
- [x] **Rust** (via _rustup_) — <https://www.rust-lang.org/tools/install>

---

## Environment Setup

### 1 Install the IC SDK

```bash
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
```

### 2 Install Node.js _(if not already installed)_

```bash
# Using NVM (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh  # or source the appropriate shell file
nvm install --lts
nvm use --lts

# — OR —  Using apt on Debian/Ubuntu
sudo apt update && sudo apt install -y curl build-essential
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3 Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup target add wasm32-unknown-unknown
```

You can also run the project helper script:

```bash
chmod +x ./scripts/setup-rust
./scripts/setup-rust
```

> **Note:** After either method, be sure to `source "$HOME/.cargo/env"` or restart your shell.

### 4 Install required system dependencies

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install -y build-essential pkg-config libssl-dev llvm clang jq curl golang-go

# Fedora
sudo dnf install -y gcc gcc-c++ make openssl-devel llvm clang jq curl golang

# Arch Linux
sudo pacman -S base-devel openssl llvm clang jq curl go
```

The additional packages include:

- `jq` - Required for parsing the dev-tools.json file
- `curl` - Required for downloading tools
- `golang-go` - Required for installing shfmt

### 5 Install essential development tools

The project defines both required and optional packages along with their respective versions in `dev-tools.json`. The following tools are essential for development:

- cargo-binstall
- ic-wasm
- didc
- candid-extractor
- shfmt

#### Option 1: Using the setup script (recommended)

The project provides a setup script that can install tools with the correct versions:

```bash
# Make the script executable
chmod +x ./scripts/setup

# Install cargo-binstall first (required for installing other tools)
./scripts/setup cargo-binstall

# Install other essential tools
./scripts/setup ic-wasm
./scripts/setup didc
./scripts/setup candid-extractor
./scripts/setup shfmt
```

You can view all available tools with:

```bash
jq -r 'keys[]' dev-tools.json
```

#### Option 2: Manual installation

If the setup script doesn't work for you, here's how to install the essential tools manually:

1. **cargo‑binstall** — installs other Rust binaries more easily:

```bash
cargo install cargo-binstall --version 1.7.4  # Check dev-tools.json for current version
```

2. Install tools with _cargo binstall_:

```bash
cargo binstall ic-wasm --version 0.8.5 --no-confirm
cargo binstall candid-extractor --version 0.1.4 --no-confirm
```

3. **didc** — manual installation if cargo-binstall fails:

```bash
# Create local bin directory if it doesn't exist
mkdir -p ~/.local/bin

# Download didc binary
curl -L "https://github.com/dfinity/candid/releases/download/2024-07-29/didc-linux64" -o ~/.local/bin/didc
chmod +x ~/.local/bin/didc

# Ensure ~/.local/bin is in your PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

4. **shfmt** — using Go:

```bash
# Install shfmt
go install mvdan.cc/sh/v3/cmd/shfmt@v3.5.1  # Check dev-tools.json for current version

# Ensure Go binaries are in your PATH
echo 'export PATH="$HOME/go/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 6 Clone the repository

```bash
git clone https://github.com/dfinity/oisy-wallet.git
cd oisy-wallet
```

---

## Running the Local Replica

From the **project root**:

```bash
dfx start --background
```

When you finish development or switch to another `dfx` project, stop the replica:

```bash
dfx stop
```

---

## Deploying OISY Locally

1. **Install frontend dependencies**

```bash
npm ci
```

2. **Configure environment variables**

```bash
cp .env.example .env.development
nano .env.development  # set any API keys as needed
```

3. **Deploy**

```bash
npm run deploy
```

Successful output ends with URLs similar to:

```
Frontend  ➜  http://127.0.0.1:4943/?canisterId=br5f7-7uaaa-aaaaa-qaaca-cai
Backend   ➜  http://127.0.0.1:4943/?canisterId=bd3sg-teaaa-aaaaa-qaaba-cai&id=bkyz2-fmaaa-aaaaa-qaaaq-cai
Internet Identity ➜ http://127.0.0.1:4943/?canisterId=bd3sg-teaaa-aaaaa-qaaba-cai&id=be2us-64aaa-aaaaa-qaabq-cai
```

Open the **Frontend** URL to access your wallet.

---

## Frontend Development

```bash
dfx start --background   # ensure replica is up
npm run dev              # Vite dev server
```

Visit the URL shown (typically `http://localhost:5173/`). Live‑reload is enabled.

### Build only

```bash
npm run build
```

---

## Backend Development

```bash
dfx deploy backend
```

---

## Bitcoin Development

### 1 Environment variable

Ensure this line is **absent or commented** in `.env.development`:

```bash
# VITE_BITCOIN_MAINNET_DISABLED=true
```

### 2 Local Bitcoin node (Regtest)

```bash
chmod +x ./scripts/setup.bitcoin-node.sh
./scripts/setup.bitcoin-node.sh          # initial setup
./scripts/setup.bitcoin-node.sh --reset  # reset if needed
```

### 3 Start DFX with Bitcoin support

```bash
chmod +x ./scripts/dfx.start-with-bitcoin.sh
./scripts/dfx.start-with-bitcoin.sh --clean   # add --clean if you were running without BTC before
```

### 4 Mine test Bitcoins

```bash
chmod +x ./scripts/add.tokens.bitcoin.sh
./scripts/add.tokens.bitcoin.sh --amount <blocks> --address <regtest_address>

# Mine one more block to confirm:
./scripts/add.tokens.bitcoin.sh
```

_(One block equals 50 BTC in regtest.)_

---

## Internationalization (i18n)

```bash
npm run i18n   # generate interfaces
```

Add a new locale:

1. Copy `src/frontend/src/lib/i18n/en.json` → `de.json` (or other code).
2. Translate the values.
3. Update imports in `src/frontend/src/lib/stores/i18n.store.ts`.

---

## Testing

```bash
# backend
npm run test:backend

# frontend
npm run test:frontend

# end‑to‑end
npm run e2e
npm run e2e:snapshots   # generate snapshots
```

---

## Troubleshooting

### LLVM / Clang errors

```bash
# Ubuntu / Debian
sudo apt install -y llvm clang
# Fedora
sudo dnf install -y llvm clang
# Arch
sudo pacman -S llvm clang
```

### DFX permission issues

```bash
echo $PATH
which dfx
chmod +x $(which dfx)
```

### Node version conflicts

```bash
nvm use --lts
node -v
```

### DFX cache problems

```bash
dfx cache delete
dfx cache install
```

### Missing SSL libraries

```bash
# Ubuntu / Debian
sudo apt install -y libssl-dev
# Fedora
sudo dnf install -y openssl-devel
# Arch
sudo pacman -S openssl
```

### Port conflicts (default 4943)

```bash
sudo lsof -i :4943      # identify process
sudo kill <PID>         # terminate if appropriate
```

You can also change the bind port in `dfx.json`:

```json
"networks": {
  "local": {
    "bind": "127.0.0.1:8000",
    "type": "ephemeral"
  }
}
```

---
