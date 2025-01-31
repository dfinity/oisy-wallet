#
# Reproducible builds of the Oisy backend canister
#

FROM --platform=linux/amd64 ubuntu@sha256:bbf3d1baa208b7649d1d0264ef7d522e1dc0deeeaaf6085bf8e4618867f03494 AS base
# Note: The above is ubuntu 22.04

ENV TZ=UTC

# Install required tools
RUN DEBIAN_FRONTEND=noninteractive apt update && apt install -y \
    curl \
    ca-certificates \
    build-essential \
    pkg-config \
    libssl-dev \
    llvm-dev \
    liblmdb-dev \
    clang \
    cmake \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Gets dfx version
#
# Note: This can be done in 'deps' but is slow because unrelated changes to dfx.json can cause a rebuild.
FROM base AS tool_versions
SHELL ["bash", "-c"]
RUN mkdir -p config
COPY dfx.json dfx.json
RUN jq -r .dfx dfx.json > config/dfx_version

# Install tools && warm up the build cache
FROM base AS deps
SHELL ["bash", "-c"]
# Install dfx
# Note: dfx is installed in `$HOME/.local/share/dfx/bin` but we can't reference `$HOME` here so we hardcode `/root`.
COPY --from=tool_versions /config/*_version config/
ENV PATH="/root/.local/share/dfx/bin:/root/.local/bin:${PATH}"
RUN DFXVM_INIT_YES=true DFX_VERSION="$(cat config/dfx_version)" sh -c "$(curl -fsSL https://sdk.dfinity.org/install.sh)" && dfx --version

# Install node
RUN curl --fail -sSf https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
ENV NVM_DIR=/root/.nvm
COPY .node-version .node-version
RUN . "$NVM_DIR/nvm.sh" && nvm install "$(cat .node-version)"
RUN . "$NVM_DIR/nvm.sh" && nvm use "v$(cat .node-version)"
RUN . "$NVM_DIR/nvm.sh" && nvm alias default "v$(cat .node-version)"
RUN ln -s "$NVM_DIR/versions/node/v$(cat .node-version)" "$NVM_DIR/versions/node/default"
ENV PATH="$NVM_DIR/versions/node/default/bin/:${PATH}"
RUN node --version
RUN npm --version

# Install Rust and Cargo in /opt
ENV RUSTUP_HOME=/opt/rustup \
    CARGO_HOME=/cargo \
    PATH=/cargo/bin:$PATH

# Copy resources	
COPY ./docker ./docker	

# Setup toolchain and ic-wasm
COPY rust-toolchain.toml .
COPY dev-tools.json .
COPY scripts/setup scripts/setup-cargo-binstall scripts/setup-rust scripts/
RUN scripts/setup rust
RUN scripts/setup cargo-binstall
RUN scripts/setup candid-extractor
RUN scripts/setup ic-wasm
RUN scripts/setup didc
RUN scripts/setup yq

# Pre-build all cargo dependencies. Because cargo doesn't have a build option
# to build only the dependencies, we pretend that our project is a simple, empty
# `lib.rs`. When we COPY the actual files we make sure to `touch` lib.rs so
# that cargo knows to rebuild it with the new content.
COPY Cargo.lock .
COPY Cargo.toml .
COPY src/backend/Cargo.toml src/backend/Cargo.toml
COPY src/cycles_ledger/client/Cargo.toml src/cycles_ledger/client/Cargo.toml
COPY src/cycles_ledger/pic/Cargo.toml src/cycles_ledger/pic/Cargo.toml
COPY src/cycles_ledger/types/Cargo.toml src/cycles_ledger/types/Cargo.toml
COPY src/shared/Cargo.toml src/shared/Cargo.toml
COPY scripts/build.backend.wasm.sh scripts/
RUN mkdir -p src/backend/src \
    && touch src/backend/src/lib.rs \
    && mkdir -p src/cycles_ledger/client/src \
    && touch src/cycles_ledger/client/src/lib.rs \
    && mkdir -p src/cycles_ledger/pic/src \
    && touch src/cycles_ledger/pic/src/lib.rs \
    && mkdir -p src/cycles_ledger/types/src \
    && touch src/cycles_ledger/types/src/lib.rs \
    && mkdir -p src/shared/src \
    && touch src/shared/src/lib.rs
RUN cargo fetch
RUN scripts/build.backend.wasm.sh
RUN rm -rf src

FROM deps AS build_backend
COPY src src
COPY scripts/build.backend.* scripts/
COPY scripts/build.report.sh scripts/
# Cache the rust build, to make the dfx build fast:
RUN scripts/build.backend.wasm.sh
# Variables that don't affect the rust build:
COPY dfx.json dfx.json
COPY canister_ids.json canister_ids.json
COPY ./in/tags in/tags
COPY ./in/commit in/commit
ENV DFX_NETWORK=ic
COPY scripts/commit-metadata scripts/
RUN touch src/*/src/lib.rs src/*/*/src/lib.rs
RUN dfx build backend --network "$DFX_NETWORK"

FROM scratch AS backend
COPY --from=build_backend out/ /
