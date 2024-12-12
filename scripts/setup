#!/usr/bin/env bash
set -euo pipefail

for tool in "${@}"; do
  echo "Installing '$tool'..."
  export tool
  install_method="$(jq -r '.[env.tool].method' dev-tools.json)"
  echo "  install_method: $install_method"
  case "$install_method" in
  "curl")
    url="$(jq -r '.[env.tool].url' dev-tools.json)"
    target="$HOME/.local/bin/$tool"
    mkdir -p "$(dirname "$target")"
    curl -Lf "$url" | install -m 755 /dev/stdin "$target"
    ;;
  "sh")
    version="$(jq -r '.[env.tool].version' dev-tools.json)" "$0-$tool"
    ;;
  "cargo-install")
    cargo install "$tool@$(jq -r '.[env.tool].version' dev-tools.json)"
    ;;
  "cargo-binstall")
    cargo binstall --force --no-confirm "${tool}@$(jq -r '.[env.tool].version' dev-tools.json)"
    ;;
  "go")
    GOBIN="$HOME/.local/bin" go install "$(jq -r '.[env.tool].source' dev-tools.json)@$(jq -r '.[env.tool].version' dev-tools.json)"
    ;;
  "snap")
    sudo snap install "$tool"
    ;;
  *)
    echo "ERROR: Unsupported install method '$install_method'"
    exit 1
    ;;
  esac
done
