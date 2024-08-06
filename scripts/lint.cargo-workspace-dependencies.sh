#!/usr/bin/env bash
echo "Checks whether all Cargo dependencies are taken from the workspace"

non_workspace_dependencies() {
  yq -oy .workspace.members[] Cargo.toml | xargs -I{} yq -oy '(.dependencies, .["dev-dependencies"]) | to_entries | .[] | select((.value.workspace != true) and (.value.path == null)) | "{}/Cargo.toml: " + .key' {}/Cargo.toml
}

bad="$(non_workspace_dependencies)"
[[ "$bad" == "" ]] || {
  echo "ERROR: The following dependencies are not taken from the workspace:"
  echo "$bad"
  exit 1
}
