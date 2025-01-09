#
# Reproducible Builds
#

FROM ubuntu:22.04 AS base
ENV TZ=UTC
# Install basic tools
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
    xxd \
    && rm -rf /var/lib/apt/lists/*


# Gets dfx version
#
# Note: This can be done in the builder but is slow because unrelated changes to dfx.json can cause a rebuild.
FROM base AS tool_versions
SHELL ["bash", "-c"]
RUN mkdir -p config
COPY dfx.json dfx.json
RUN jq -r .dfx dfx.json > config/dfx_version


# Install tools && warm up the build cache
FROM base AS builder
SHELL ["bash", "-c"]
# Install dfx
# Note: dfx is installed in `$HOME/.local/share/dfx/bin` but we can't reference `$HOME` here so we hardcode `/root`.
COPY --from=tool_versions /config/*_version config/
ENV PATH="/root/.local/share/dfx/bin:/root/.local/bin:${PATH}"
RUN DFXVM_INIT_YES=true DFX_VERSION="$(cat config/dfx_version)" sh -c "$(curl -fsSL https://sdk.dfinity.org/install.sh)" && dfx --version
# Install Rust
COPY ./rust-toolchain.toml .
ENV RUSTUP_HOME=/opt/rustup \
    CARGO_HOME=/cargo \
    PATH=/cargo/bin:$PATH
COPY dev-tools.json dev-tools.json
COPY scripts/setup scripts/setup-cargo-binstall scripts/setup-rust scripts/
RUN scripts/setup rust
RUN scripts/setup cargo-binstall
RUN scripts/setup candid-extractor
RUN scripts/setup ic-wasm
RUN scripts/setup didc

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
RUN mkdir -p src/backend/src \
    && touch src/backend/src/lib.rs \
    && mkdir -p src/cycles_ledger/client/src \
    && touch src/cycles_ledger/client/src/lib.rs \
    && mkdir -p src/cycles_ledger/pic/src \
    && touch src/cycles_ledger/pic/src/lib.rs \
    && mkdir -p src/cycles_ledger/types/src \
    && touch src/cycles_ledger/types/src/lib.rs \
    && mkdir -p src/shared/src \
    && touch src/shared/src/lib.rs \
    && cargo fetch --locked \
    && rm -rf src

FROM builder AS build_backend
COPY src src
COPY dfx.json dfx.json
COPY canister_ids.json canister_ids.json
COPY scripts/build.backend.* scripts/
COPY scripts/build.report.sh scripts/
# The Wasm build is slow and typically cached:
RUN scripts/build.backend.wasm.sh
# Commit will change even with unrelated changes, so is afetr the rust build:
COPY ./target/tags target/tags
COPY ./target/commit target/commit
# The network may be overridden with arguments to the docker call:  --env DFX_NETWORK=whatever 
# Note: The rust is re-built but that is fast.
ENV DFX_NETWORK=ic
RUN dfx build backend --network "$DFX_NETWORK"

FROM scratch AS backend
COPY --from=build_backend out/ /
