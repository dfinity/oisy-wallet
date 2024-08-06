#!/usr/bin/env bash
cd "$(dirname "$(realpath "$0")")/.." || exit

print_help() {
  cat <<-EOF

	Formats bash scripts.
	EOF
  # TODO: Consider using clap for argument parsing.  If not, describe the flags here.
}

# Lists all files that should be formatted.
list_files() {
  git ls-files | filter
}

# Selects eligible files; filenames are read from stdin, one line per filename.
filter() {
  while read -r line; do if [[ "$line" = *.sh ]] || file "$line" | grep -qw Bourne; then echo "$line"; fi; done
}

# Formatting options
options=(-i 2)

case "${1:-}" in
--help) print_help && exit 0 ;;
--list | -l) list_files ;;
--check | -c) list_files | xargs -P8 -I{} shfmt "${options[@]}" -d "{}" ;;
--modified | -m) git ls-files --modified | filter | xargs -P8 -I{} shfmt -l -w "${options[@]}" "{}" ;;
"") list_files | xargs -P8 -I{} shfmt -l -w "${options[@]}" "{}" ;;
--)
  shift 1
  for file in "$@"; do shfmt -l -w "${options[@]}" "$file"; done
  ;;
*) for file in "$@"; do shfmt -l -w "${options[@]}" "$file"; done ;;
esac
