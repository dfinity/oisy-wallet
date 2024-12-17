FROM --platform=linux/amd64 ubuntu@sha256:bbf3d1baa208b7649d1d0264ef7d522e1dc0deeeaaf6085bf8e4618867f03494 AS deps
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

RUN curl --proto '=https' --tlsv1.2 -L https://github.com/mikefarah/yq/releases/download/v4.33.3/yq_linux_amd64 | install -m 755 /dev/stdin /bin/yq && yq --version | grep yq

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
COPY ./rust-toolchain.toml ./rust-toolchain.toml

# Setup toolchain and ic-wasm
RUN ./docker/bootstrap

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
ENV CARGO_TARGET_DIR=/cargo_target
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
    && ./docker/build --only-dependencies \
    && rm -rf src

FROM deps AS build_backend

COPY . .

RUN touch src/*/src/lib.rs src/*/*/src/lib.rs

RUN ./docker/build --backend

RUN sha256sum /backend.wasm.gz

FROM scratch AS scratch_backend
COPY --from=build_backend /backend.wasm.gz /
