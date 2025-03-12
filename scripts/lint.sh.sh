#!/usr/bin/env bash
cd "$(dirname "$(realpath "$0")")/.." || exit

print_help() {
  cat <<-EOF

	Lints bash scripts
	EOF
}

# Lists all files that should be formatted.
list_files() {
  git ls-files | filter
}

# Selects eligible files; filenames are read from stdin, one line per filename.
filter() {
  while read -r line; do if [[ "$line" = *.sh ]] || file "$line" | grep -qw Bourne; then echo "$line"; fi; done
}

options=(-e SC1090 -e SC1091)

case "${1:-}" in
--help) print_help && exit 0 ;;
"") list_files | xargs -P8 -I{} shellcheck "${options[@]}" "{}" ;;
esac
