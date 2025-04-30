# OISY Wallet Development on Windows

This guide provides detailed instructions for setting up and running the OISY wallet project on Windows, including both native Windows development and using Windows Subsystem for Linux (WSL).

## Table of Contents

- [Native Windows Development](#native-windows-development)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Running the Local Replica](#running-the-local-replica)
  - [Deploying OISY Locally](#deploying-oisy-locally)
  - [Troubleshooting](#troubleshooting)
  - [Frontend Development](#frontend-development)
  - [Backend Development](#backend-development)
  - [Bitcoin Development](#bitcoin-development)
  - [Internationalization](#internationalization)
  - [Testing](#testing)
- [Development with WSL](#development-with-wsl)
  - [Installing WSL](#installing-wsl)
  - [Setting Up the Development Environment in WSL](#setting-up-the-development-environment-in-wsl)
  - [Running OISY in WSL](#running-oisy-in-wsl)
  - [WSL Tips and Tricks](#wsl-tips-and-tricks)

## Native Windows Development

### Prerequisites

- [x] Install the [IC SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/index.mdx) for Windows.
- [x] Install [Node.js](https://nodejs.org/) (LTS version recommended).
- [x] Install [Git for Windows](https://git-scm.com/download/win).
- [x] Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with C++ build tools for Rust dependencies.
- [x] Install [Rust](https://www.rust-lang.org/tools/install) using rustup.

### Setup

1. **Configure Git for Windows**:

   - During installation, select the option to use Git from the Windows Command Prompt.
   - Choose the recommended line ending conversion settings.

2. **Configure Rust**:

   - After installing rustup, open PowerShell and run:

   ```powershell
   rustup default stable
   rustup target add wasm32-unknown-unknown
   ```

3. **Install Required Development Tools**:

   - The project uses several development tools with specific versions defined in [dev-tools.json](dev-tools.json).
   - While Linux users can use the `./scripts/setup` script, Windows users need to install these tools manually.
   - The following tools are recommended for installation:

     a. **cargo-binstall** (version specified in dev-tools.json):
     ```powershell
     cargo install cargo-binstall@1.7.4
     ```

     b. **ic-wasm** (using cargo-binstall):
     ```powershell
     cargo binstall --force --no-confirm ic-wasm@0.8.5
     ```

     c. **didc**:
     - Download from https://github.com/dfinity/candid/releases/download/2024-07-29/didc-win64.exe
     - Rename to `didc.exe` and place it in a directory that's in your PATH

     d. **candid-extractor** (using cargo-binstall):
     ```powershell
     cargo binstall --force --no-confirm candid-extractor@0.1.4
     ```

     e. **shfmt** (if you have Go installed):
     ```powershell
     go install mvdan.cc/sh/v3/cmd/shfmt@v3.5.1
     ```

   - Note: The versions above are based on the current dev-tools.json file. Check the file for the most up-to-date versions.

4. **Configure Environment Variables**:
   - Ensure that the following are added to your PATH:
     - Node.js installation directory
     - Rust bin directory (usually added automatically by the installer)
     - DFX installation directory
     - Directory containing the development tools installed above

### Running the Local Replica

Open PowerShell or Command Prompt _in the project directory_, and run the following command to start the local replica. The replica will not start unless [dfx.json](dfx.json) exists in the current directory.

```powershell
dfx start --background
```

When you're done with development, or you're switching to a different dfx project, running

```powershell
dfx stop
```

from the project directory will stop the local replica.

### Deploying OISY Locally

Make sure you switch back to the project root directory.

1. **Install frontend dependencies**:

   ```powershell
   npm ci
   ```

2. **Configure environment variables**:

   - Create a `.env.development` file by copying the [.env.example](.env.example) file:

   ```powershell
   Copy-Item .env.example .env.development
   ```

   - Edit the `.env.development` file to set the API keys for the services that OISY needs.
   - For local development, you can keep most settings as they are in the example file.

3. **Deploy the project locally**:

   ```powershell
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
   - Click on the **frontend** URL to access the OISY Wallet that is running locally.

### Troubleshooting

1. **Path length limitations**:

   - Windows has a default path length limitation of 260 characters.
   - If you encounter path-related errors, enable long path support:

   ```powershell
   # Run as administrator
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

2. **Permission issues**:

   - If you encounter permission errors when running dfx commands, try running PowerShell as Administrator.

3. **Node.js native module compilation**:

   - If you encounter errors related to node-gyp or native module compilation:

   ```powershell
   npm config set msvs_version 2019
   ```

4. **Rust compilation errors**:

   - Ensure your Rust toolchain is up to date:

   ```powershell
   rustup update
   ```

5. **DFX cache issues**:
   - If you encounter unexpected behavior, try clearing the DFX cache:
   ```powershell
   dfx cache delete
   ```

### Frontend Development

If you want to work on the frontend in development mode:

1. **Ensure the local replica is running**:

   ```powershell
   dfx start --background
   ```

2. **Start the frontend development server**:

   ```powershell
   npm run dev
   ```

3. **Access the development server**:

   - Open your browser and navigate to the URL shown in the terminal (typically http://localhost:5173/).
   - Changes to the frontend code will be automatically reflected in the browser.

4. **Building the frontend only**:
   - If you want to build the frontend without deploying:
   ```powershell
   npm run build
   ```

### Backend Development

If you want to deploy only the backend:

```powershell
dfx deploy backend
```

### Bitcoin Development

To develop with Bitcoin functionality locally on Windows:

1. **Configure Bitcoin environment variables**:

   - Ensure the following line is disabled or completely absent in your `.env.development` file:

   ```
   VITE_BITCOIN_MAINNET_DISABLED=false    # or remove this line
   ```

2. **Set up a local Bitcoin node (Regtest)**:

   - Open Git Bash (not PowerShell) and run:

   ```bash
   ./scripts/setup.bitcoin-node.sh
   ```

   - This script will download and set up a local Bitcoin node from [Bitcoin.org](https://bitcoin.org/en/download).
   - To reset the node if needed:

   ```bash
   ./scripts/setup.bitcoin-node.sh --reset
   ```

3. **Start DFX with Bitcoin support**:

   - Open Git Bash and run:

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

> **Note for Windows users**: The Bitcoin scripts are bash scripts. You'll need to run them using Git Bash, which comes with Git for Windows installation.

### Internationalization

OISY supports internationalization through JSON files. To work with translations:

1. **Generate interfaces for translations**:

   ```powershell
   npm run i18n
   ```

2. **Add a new language**:
   - Copy `src/frontend/src/lib/i18n/en.json` to a new file with the appropriate language code (e.g., `de.json` for German).
   - Translate each key in the newly created file.
   - Update the imports in `src/frontend/src/lib/stores/i18n.store.ts`.

### Testing

To run tests on your Windows machine:

1. **Run backend tests**:

   ```powershell
   npm run test:backend
   ```

2. **Run frontend tests**:

   ```powershell
   npm run test:frontend
   ```

3. **Run E2E tests**:

   ```powershell
   npm run e2e
   ```

4. **Generate E2E snapshots**:
   ```powershell
   npm run e2e:snapshots
   ```

> **Note**: E2E tests generate different snapshots on Windows compared to macOS or Linux. If you're contributing to the project, be aware that CI runs on Linux.

## Development with WSL

Using Windows Subsystem for Linux (WSL) can provide a more Linux-like development experience, which may be preferable for some developers and can help avoid certain Windows-specific issues.

### Installing WSL

1. **Enable WSL and install a Linux distribution**:

   - Open PowerShell as Administrator and run:

   ```powershell
   wsl --install
   ```

   - This will install WSL 2 with Ubuntu by default. If you want a different distribution, you can specify it:

   ```powershell
   wsl --install -d Debian
   ```

2. **Restart your computer** after the installation completes.

3. **Complete the Linux setup**:
   - When you first launch WSL, you'll be prompted to create a username and password for your Linux distribution.

### Setting Up the Development Environment in WSL

1. **Update your Linux distribution**:

   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js**:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install Rust**:

   You can use the project's setup-rust script:

   ```bash
   git clone https://github.com/dfinity/oisy-wallet.git
   cd oisy-wallet
   ./scripts/setup-rust
   ```

   Or manually install:

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   rustup target add wasm32-unknown-unknown
   ```

4. **Install the IC SDK**:

   ```bash
   sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
   ```

5. **Install additional dependencies**:

   ```bash
   sudo apt install -y build-essential pkg-config libssl-dev llvm clang
   ```

6. **Install required development tools**:

   The project uses several development tools with specific versions defined in [dev-tools.json](dev-tools.json).
   In WSL, you can use the setup script to install them:

   ```bash
   # Install recommended tools
   ./scripts/setup cargo-binstall
   ./scripts/setup ic-wasm
   ./scripts/setup didc
   ./scripts/setup candid-extractor
   ./scripts/setup shfmt
   ```

7. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/dfinity/oisy-wallet.git
   cd oisy-wallet
   ```

### Running OISY in WSL

The process for running OISY in WSL is similar to the Linux instructions:

1. **Start the local replica**:

   ```bash
   dfx start --background
   ```

2. **Install dependencies**:

   ```bash
   npm ci
   ```

3. **Configure environment variables**:

   ```bash
   cp .env.example .env.development
   # Edit .env.development as needed
   ```

4. **Deploy the project**:

   ```bash
   npm run deploy
   ```

5. **Access the wallet**:
   - Open your browser and navigate to the URL provided in the output (typically http://127.0.0.1:4943/?canisterId=...).

### WSL Tips and Tricks

1. **Accessing Windows files from WSL**:

   - Windows drives are mounted under `/mnt/` in WSL. For example, your C: drive is accessible at `/mnt/c/`.
   - You can access your Windows user directory with `/mnt/c/Users/<YourUsername>/`.

2. **Accessing WSL files from Windows**:

   - You can access your WSL files from Windows Explorer by entering `\\wsl$\<DistributionName>\` in the address bar.
   - For example, `\\wsl$\Ubuntu\home\<YourUsername>\`.

3. **Using VS Code with WSL**:

   - Install the "Remote - WSL" extension in VS Code.
   - Open a folder in WSL by clicking on the green remote indicator in the bottom-left corner of VS Code and selecting "Remote-WSL: New Window".

4. **Running GUI applications**:

   - WSL 2 supports running GUI applications directly. You can install a browser within WSL if needed:

   ```bash
   sudo apt install -y firefox
   ```

5. **Sharing Git credentials**:

   - To use your Windows Git credentials in WSL:

   ```bash
   git config --global credential.helper "/mnt/c/Program\ Files/Git/mingw64/bin/git-credential-manager.exe"
   ```

6. **Improving WSL performance**:

   - Add the following to your `.wslconfig` file in your Windows user directory to allocate more resources to WSL:

   ```
   [wsl2]
   memory=8GB
   processors=4
   ```

7. **Handling Bitcoin development in WSL**:

   - The Bitcoin scripts should work more reliably in WSL than in Git Bash on Windows.
   - Run the Bitcoin setup and mining commands directly in your WSL terminal:

   ```bash
   ./scripts/setup.bitcoin-node.sh
   ./scripts/dfx.start-with-bitcoin.sh
   ```

8. **Resolving port conflicts**:
   - If you encounter port conflicts between Windows and WSL, you can modify the port forwarding:
   ```bash
   netsh interface portproxy add v4tov4 listenport=4943 listenaddress=0.0.0.0 connectport=4943 connectaddress=$(wsl hostname -I)
   ```

By using WSL, you can leverage the Linux development environment while still working on your Windows machine, potentially avoiding some of the Windows-specific issues that might arise during development.
