FROM ubuntu:22.04 as deps

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

# Install Rust and Cargo in /opt
ENV RUSTUP_HOME=/opt/rustup \
    CARGO_HOME=/cargo \
    PATH=/cargo/bin:$PATH

# Copy resources
COPY ./docker ./docker
COPY ./rust-toolchain.toml ./rust-toolchain.toml

# Setup toolchain and ic-wasm
RUN ./docker/bootstrap

# Pre-build all cargo dependencies. Because cargo doesn't have a build option
# to build only the dependecies, we pretend that our project is a simple, empty
# `lib.rs`. When we COPY the actual files we make sure to `touch` lib.rs so
# that cargo knows to rebuild it with the new content.
COPY Cargo.lock .
COPY Cargo.toml .
COPY src/backend/Cargo.toml src/backend/Cargo.toml
COPY src/shared/Cargo.toml src/shared/Cargo.toml
ENV CARGO_TARGET_DIR=/cargo_target
RUN mkdir -p src/backend/src \
    && touch src/backend/src/lib.rs \
    && mkdir -p src/shared/src \
    && touch src/shared/src/lib.rs \
    && ./docker/build --only-dependencies \
    && rm -rf src

FROM deps as build_backend

COPY . .

RUN touch src/*/src/lib.rs

RUN ./docker/build --backend
RUN sha256sum /backend.wasm.gz

FROM scratch AS scratch_backend
COPY --from=build_backend /backend.wasm.gz /
COPY --from=build_backend /backend.did /