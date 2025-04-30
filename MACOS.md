# OISY Wallet Development on macOS

This guide provides detailed instructions for setting up and running the OISY wallet project on macOS.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Development Tools](#development-tools)
- [Running the Local Replica](#running-the-local-replica)
- [Deploying OISY Locally](#deploying-oisy-locally)
- [Frontend Development](#frontend-development)
- [Backend Development](#backend-development)
- [Bitcoin Development](#bitcoin-development)
- [Internationalization](#internationalization)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed on your macOS system:

- [x] [Homebrew](https://brew.sh/) - The package manager for macOS
- [x] [IC SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/index.mdx) for macOS
- [x] [Node.js](https://nodejs.org/) (LTS version recommended)
- [x] [Git](https://git-scm.com/download/mac)
- [x] [Rust](https://www.rust-lang.org/tools/install) using rustup

## Environment Setup

1. **Install Homebrew** (if not already installed):

   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install the IC SDK**:

   ```bash
   sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
   ```

3. **Install Node.js** (if not already installed):

   ```bash
   # Using Homebrew
   brew install node

   # Or using NVM (recommended for managing multiple Node.js versions)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
   source ~/.zshrc  # or source ~/.bash_profile if using bash
   nvm install --lts
   ```

4. **Install Rust**:

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   rustup target add wasm32-unknown-unknown
   ```

5. **Install LLVM** (required for Rust dependencies):

   ```bash
   brew install llvm
   ```

6. **Configure LLVM paths** (add to your shell profile):

   ```bash
   # For zsh (default in macOS Catalina and later)
   echo 'export CC=$(brew --prefix llvm)/bin/clang' >> ~/.zshrc
   echo 'export AR=$(brew --prefix llvm)/bin/llvm-ar' >> ~/.zshrc
   echo 'export PATH=$(brew --prefix llvm)/bin:$PATH' >> ~/.zshrc
   source ~/.zshrc

   # For bash
   echo 'export CC=$(brew --prefix llvm)/bin/clang' >> ~/.bash_profile
   echo 'export AR=$(brew --prefix llvm)/bin/llvm-ar' >> ~/.bash_profile
   echo 'export PATH=$(brew --prefix llvm)/bin:$PATH' >> ~/.bash_profile
   source ~/.bash_profile
   ```

7. **Clone the repository**:
   ```bash
   git clone https://github.com/dfinity/oisy-wallet.git
   cd oisy-wallet
   ```

## Development Tools

The project uses several development tools defined in `dev-tools.json` with their specific versions. You can install these tools using the setup script:

```bash
./scripts/setup <tool-name>
```

For example, to install cargo-binstall:

```bash
./scripts/setup cargo-binstall
```

Not all packages in `dev-tools.json` are required. The essential ones recommended for installation are:

- cargo-binstall
- ic-wasm
- didc
- candid-extractor
- shfmt

You can also leverage the Rust setup script:

```bash
./scripts/setup-rust
```

This script installs Rust with the correct version specified in `rust-toolchain.toml` and also installs the nightly version specified in `dev-tools.json`.

## Running the Local Replica

Open a terminal window _in the project directory_, and run the following command to start the local replica. The replica will not start unless [dfx.json](dfx.json) exists in the current directory.

```bash
dfx start --background
```

When you're done with development, or you're switching to a different dfx project, running

```bash
dfx stop
```

from the project directory will stop the local replica.

## Deploying OISY Locally

Make sure you are in the project root directory.

1. **Install frontend dependencies**:

   ```bash
   npm ci
   ```

2. **Configure environment variables**:

   - Create a `.env.development` file by copying the [.env.example](.env.example) file:

   ```bash
   cp .env.example .env.development
   ```

   - Edit the `.env.development` file to set the API keys for the services that OISY needs:

   ```bash
   nano .env.development  # or use your preferred text editor
   ```

   - For local development, you can keep most settings as they are in the example file.

3. **Deploy the project locally**:

   ```bash
   npm run deploy
   ```

   It should output something like the following:

   ```
   ...
   Deployed canisters.
   URLs:
     Frontend canister via browser
       frontend: http://127.0.0.1:4943/?canisterId=br5f7-7uaaa-aaaaa-qaaca-cai
     Backend canister via Candid interface:
       backend: http://127.0.0.1:4943/?canisterId=bd3sg-teaaa-aaaaa-qaaba-cai&id=bkyz2-fmaaa-aaaaa-qaaaq-cai
       internet_identity: http://127.0.0.1:4943/?canisterId=bd3sg-teaaa-aaaaa-qaaba-cai&id=be2us-64aaa-aaaaa-qaabq-cai
   ```

4. **Access the wallet**:
   - Open your browser and navigate to the **frontend** URL to access the OISY Wallet that is running locally.

## Frontend Development

If you want to work on the frontend in development mode:

1. **Ensure the local replica is running**:

   ```bash
   dfx start --background
   ```

2. **Start the frontend development server**:

   ```bash
   npm run dev
   ```

3. **Access the development server**:

   - Open your browser and navigate to the URL shown in the terminal (typically http://localhost:5173/).
   - Changes to the frontend code will be automatically reflected in the browser.

4. **Building the frontend only**:
   - If you want to build the frontend without deploying:
   ```bash
   npm run build
   ```

## Backend Development

If you want to deploy only the backend:

```bash
dfx deploy backend
```

## Bitcoin Development

To develop with Bitcoin functionality locally on macOS:

1. **Configure Bitcoin environment variables**:

   - Ensure the following line is disabled or completely absent in your `.env.development` file:

   ```
   VITE_BITCOIN_MAINNET_DISABLED=false    # or remove this line
   ```

2. **Set up a local Bitcoin node (Regtest)**:

   ```bash
   ./scripts/setup.bitcoin-node.sh
   ```

   - This script will download and set up a local Bitcoin node from [Bitcoin.org](https://bitcoin.org/en/download).
   - To reset the node if needed:

   ```bash
   ./scripts/setup.bitcoin-node.sh --reset
   ```

3. **Start DFX with Bitcoin support**:

   ```bash
   ./scripts/dfx.start-with-bitcoin.sh
   ```

   - If you were running a local replica before without Bitcoin, use the `--clean` flag:

   ```bash
   ./scripts/dfx.start-with-bitcoin.sh --clean
   ```

4. **Mine test Bitcoins**:
   - To get test Bitcoins for your wallet address:
   ```bash
   ./scripts/add.tokens.bitcoin.sh --amount <amount-in-blocks> --address <test-user-address>
   ```
   - Note: One block equals 50 Bitcoin.
   - After transactions, mine a new block to make transferred tokens available:
   ```bash
   ./scripts/add.tokens.bitcoin.sh
   ```

## Internationalization

OISY supports internationalization through JSON files. To work with translations:

1. **Generate interfaces for translations**:

   ```bash
   npm run i18n
   ```

2. **Add a new language**:
   - Copy `src/frontend/src/lib/i18n/en.json` to a new file with the appropriate language code (e.g., `de.json` for German).
   - Translate each key in the newly created file.
   - Update the imports in `src/frontend/src/lib/stores/i18n.store.ts`.

## Testing

To run tests on your macOS machine:

1. **Run backend tests**:

   ```bash
   npm run test:backend
   ```

2. **Run frontend tests**:

   ```bash
   npm run test:frontend
   ```

3. **Run E2E tests**:

   ```bash
   npm run e2e
   ```

4. **Generate E2E snapshots**:
   ```bash
   npm run e2e:snapshots
   ```

## Troubleshooting

1. **LLVM/Clang issues**:

   - If you encounter errors related to LLVM or Clang during Rust compilation:

   ```bash
   brew install llvm

   # For zsh
   echo 'export CC=$(brew --prefix llvm)/bin/clang' >> ~/.zshrc
   echo 'export AR=$(brew --prefix llvm)/bin/llvm-ar' >> ~/.zshrc
   echo 'export PATH=$(brew --prefix llvm)/bin:$PATH' >> ~/.zshrc
   source ~/.zshrc

   # For bash
   echo 'export CC=$(brew --prefix llvm)/bin/clang' >> ~/.bash_profile
   echo 'export AR=$(brew --prefix llvm)/bin/llvm-ar' >> ~/.bash_profile
   echo 'export PATH=$(brew --prefix llvm)/bin:$PATH' >> ~/.bash_profile
   source ~/.bash_profile
   ```

2. **Apple Silicon (M1/M2) specific issues**:

   - If you're using an Apple Silicon Mac and encounter architecture-related issues:

   ```bash
   # Install Rosetta 2 if you haven't already
   softwareupdate --install-rosetta

   # Use the x86_64 version of Homebrew alongside the arm64 version
   arch -x86_64 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

   # Add to your shell profile
   echo 'alias ibrew="arch -x86_64 /usr/local/bin/brew"' >> ~/.zshrc
   source ~/.zshrc

   # Install x86_64 versions of packages if needed
   ibrew install <package-name>
   ```

3. **Node.js version conflicts**:

   - If you have multiple Node.js versions installed, ensure you're using the correct one:

   ```bash
   # If using NVM
   nvm use --lts
   ```

4. **DFX cache issues**:

   - If you encounter unexpected behavior, try clearing the DFX cache:

   ```bash
   dfx cache delete
   ```

5. **Permission issues**:

   - If you encounter permission errors when running scripts:

   ```bash
   chmod +x scripts/*.sh
   ```

6. **Port conflicts**:

   - If you encounter port conflicts when starting the local replica:

   ```bash
   # Check if port 4943 is in use
   lsof -i :4943

   # Kill the process using the port
   kill <PID>
   ```

7. **Homebrew installation issues**:

   - If you encounter issues with Homebrew:

   ```bash
   # Update Homebrew
   brew update

   # Diagnose issues
   brew doctor
   ```
