#!/usr/bin/env bash
set -euo pipefail

# Files the production release requests on the Orbit station `oisy-prod`.
#
# For every selected canister it builds the artefacts reproducibly in docker and
# then files the Orbit request, collecting the request id (and, for asset
# canisters, the batch id). At the end it renders the Slack announcement that
# the reviewers verify against.
#
# It only ever *requests*. It never approves, and it never posts anywhere.

STATION="oisy-prod"
STATION_ID="7hkwe-3qaaa-aaaal-amhvq-cai"
GUIDE_URL="https://dfinity.atlassian.net/wiki/spaces/OISY/pages/2524938286/OISY+Orbit+guide"
ALL_TARGETS="backend frontend signer_frontend legacy_signer_frontend"

# A run checks out the release tag, which would rewrite this file underneath the
# running shell. Copy ourselves out of the repo and re-exec before touching git.
if [ -z "${OISY_RELEASE_REEXEC:-}" ]; then
  OISY_RELEASE_ROOT="$(cd "$(dirname "$(realpath "$0")")/.." && pwd)"
  export OISY_RELEASE_ROOT
  self_copy="$(mktemp "${TMPDIR:-/tmp}/oisy-prod-release.XXXXXX")"
  cat "$0" >"$self_copy"
  export OISY_RELEASE_REEXEC=1
  exec bash "$self_copy" "$@"
fi
trap 'rm -f "$0"' EXIT
REPO_ROOT="${OISY_RELEASE_ROOT:?}"
cd "$REPO_ROOT"

if [ -t 1 ]; then
  BOLD="$(printf '\033[1m')"
  DIM="$(printf '\033[2m')"
  RED="$(printf '\033[31m')"
  GREEN="$(printf '\033[32m')"
  YELLOW="$(printf '\033[33m')"
  BLUE="$(printf '\033[34m')"
  RESET="$(printf '\033[0m')"
else
  BOLD="" DIM="" RED="" GREEN="" YELLOW="" BLUE="" RESET=""
fi

say() { printf '%s\n' "$*"; }
step() { printf '\n%s==> %s%s\n' "$BOLD$BLUE" "$*" "$RESET"; }
ok() { printf '%s  ok%s %s\n' "$GREEN" "$RESET" "$*"; }
note() { printf '%s  %s%s\n' "$DIM" "$*" "$RESET"; }
warn() { printf '%s  warning:%s %s\n' "$YELLOW" "$RESET" "$*" >&2; }
die() {
  printf '\n%serror:%s %s\n' "$RED$BOLD" "$RESET" "$*" >&2
  exit 1
}

print_help() {
  cat <<-EOF

	Files the OISY production release requests on the Orbit station "$STATION".

	Usage: scripts/prod.release.sh [--tag vX.Y.Z] [--targets a,b,c] [--yes]

	  --tag      Release tag to build. Defaults to the latest tag, confirmed interactively.
	  --targets  Comma separated subset of: $ALL_TARGETS
	             Use "none" to only re-render the message from an earlier run.
	  --yes      Skip the final confirmation prompt. Everything else still stops on error.
	  --help     Print this message.

	The run is resumable: request and batch ids are recorded per tag under
	~/.oisy-release/<tag>/state.env, and targets already filed are offered as skipped.

	EOF
}

# --- target metadata --------------------------------------------------------

target_label() {
  case "$1" in
  backend) echo "Backend" ;;
  frontend) echo "Frontend" ;;
  signer_frontend) echo "Signer Frontend" ;;
  legacy_signer_frontend) echo "Legacy Signer Frontend" ;;
  *) die "unknown target: $1" ;;
  esac
}

target_prefix() { echo "$1" | tr '[:lower:]' '[:upper:]'; }

# Every build script wipes its output directory first, so a build and its
# request have to run back to back, one target at a time.
run_build() {
  case "$1" in
  backend) ./scripts/docker-build ;;
  frontend) ./scripts/docker-build.frontend ;;
  signer_frontend) ./scripts/docker-build.signer-frontend ;;
  legacy_signer_frontend) ./scripts/docker-build.legacy-signer-frontend ;;
  esac
}

run_request() {
  case "$1" in
  backend)
    dfx-orbit --station "$STATION" request canister install backend \
      --mode upgrade \
      --wasm out/backend.wasm.gz \
      --arg-file out/backend.args.did
    ;;
  frontend)
    dfx-orbit --station "$STATION" request asset upload frontend --files target/frontend
    ;;
  signer_frontend)
    dfx-orbit --station "$STATION" request asset upload signer_frontend --files target/signer_frontend
    ;;
  legacy_signer_frontend)
    dfx-orbit --station "$STATION" request asset upload legacy_signer_frontend --files target/legacy_signer_frontend
    ;;
  esac
}

# --- interactive pickers ----------------------------------------------------

confirm() {
  local prompt="$1" default="${2:-n}" reply hint="[y/N]"
  [ "$default" = "y" ] && hint="[Y/n]"
  printf '%s %s ' "$prompt" "$hint"
  read -r reply || true
  [ -z "$reply" ] && reply="$default"
  case "$reply" in
  y | Y | yes | YES) return 0 ;;
  *) return 1 ;;
  esac
}

# Renders a checkbox list. Up/down moves, space toggles, enter confirms.
# Reads CHECKED (parallel to TARGET_KEYS) and writes the result back into it.
choose_targets() {
  local cursor=0 count=${#TARGET_KEYS[@]} key rest i

  printf '\n%sSelect the canisters to release%s %s(arrows to move, space to toggle, enter to confirm)%s\n' \
    "$BOLD" "$RESET" "$DIM" "$RESET"
  while :; do
    for i in $(seq 0 $((count - 1))); do
      local mark=" " pointer="  "
      [ "${CHECKED[$i]}" = "1" ] && mark="x"
      [ "$i" = "$cursor" ] && pointer="$BLUE>$RESET "
      printf '%s[%s] %s\033[K\n' "$pointer" "$mark" "$(target_label "${TARGET_KEYS[$i]}")"
    done

    IFS= read -rsn1 key || die "no input available, pass --targets instead"
    if [ "$key" = $'\033' ]; then
      read -rsn2 -t 0.1 rest || true
      key="$key$rest"
    fi
    case "$key" in
    $'\033[A' | k) [ "$cursor" -gt 0 ] && cursor=$((cursor - 1)) ;;
    $'\033[B' | j) [ "$cursor" -lt $((count - 1)) ] && cursor=$((cursor + 1)) ;;
    ' ')
      if [ "${CHECKED[cursor]}" = "1" ]; then CHECKED[cursor]=0; else CHECKED[cursor]=1; fi
      ;;
    q) die "aborted" ;;
    '') break ;;
    esac
    printf '\033[%dA' "$count"
  done
}

# --- preflight --------------------------------------------------------------

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

TAG=""
TARGETS_ARG=""
ASSUME_YES=0
while [ $# -gt 0 ]; do
  case "$1" in
  --help | -h)
    print_help
    exit 0
    ;;
  --tag)
    TAG="${2:?--tag needs a value}"
    shift 2
    ;;
  --targets)
    TARGETS_ARG="${2:?--targets needs a value}"
    shift 2
    ;;
  --yes | -y)
    ASSUME_YES=1
    shift
    ;;
  *) die "unknown argument: $1 (see --help)" ;;
  esac
done

step "Preflight"

command -v docker >/dev/null 2>&1 || die "docker is not installed"
docker info >/dev/null 2>&1 || die "docker is not running"
command -v dfx-orbit >/dev/null 2>&1 || die "dfx-orbit is not installed, see the Orbit guide"
ok "docker and dfx-orbit $(dfx-orbit --version | awk '{print $2}')"

station_show="$(dfx-orbit station show 2>/dev/null || true)"
case "$station_show" in
*"$STATION_ID"*) ok "station $STATION ($STATION_ID)" ;;
*) die "the active station is not $STATION. Run: dfx-orbit station use $STATION" ;;
esac

dfx-orbit me >/dev/null 2>&1 || die "dfx-orbit me failed, your identity cannot reach the station"
ok "identity reaches the station"

dirty="$(git status --porcelain --untracked-files=no)"
[ -z "$dirty" ] || die "the working tree has uncommitted changes, a release must build a clean tree"
ok "working tree is clean"

# --- env file ---------------------------------------------------------------

step "Production env file"

[ -f .env.production ] || die ".env.production is missing. Copy it from 1pass into $REPO_ROOT"
ENV_SHA_COMPUTED="$(sha256_of .env.production)"
ENV_SHA="$ENV_SHA_COMPUTED"
say "  $BOLD$ENV_SHA$RESET  .env.production"
note "$(grep -c '^[A-Z]' .env.production 2>/dev/null || echo 0) variables, modified $(date -r .env.production '+%Y-%m-%d %H:%M')"
say ""
say "  This hash goes into the release message and every reviewer checks against it."
say "  Confirm the file is the current production env from 1pass, feature flags included."
confirm "  Is this the correct .env.production?" || die "aborted, fix the env file and run again"

# --- tag --------------------------------------------------------------------

step "Release tag"

# --force so a tag that was moved upstream updates locally instead of failing the
# fetch, which is silent under --quiet and would abort the run without a reason.
git fetch --tags --force --quiet || die "git fetch --tags failed"
LATEST_TAG="$(git tag --sort=-v:refname | head -1)"
if [ -z "$TAG" ]; then
  say "  The latest tag is $BOLD$LATEST_TAG$RESET."
  printf '  Tag to release [%s]: ' "$LATEST_TAG"
  read -r TAG || true
  [ -z "$TAG" ] && TAG="$LATEST_TAG"
fi

git rev-parse -q --verify "refs/tags/$TAG" >/dev/null || die "tag $TAG does not exist"
RELEASE_COMMIT_RESOLVED="$(git rev-parse "refs/tags/$TAG^{commit}")"
RELEASE_COMMIT="$RELEASE_COMMIT_RESOLVED"
[ "$TAG" = "$LATEST_TAG" ] || warn "$TAG is not the latest tag ($LATEST_TAG)"
ok "$TAG is $RELEASE_COMMIT"
note "$(git log -1 --format='%s' "$RELEASE_COMMIT")"

STATE_DIR="$HOME/.oisy-release/$TAG"
STATE_FILE="$STATE_DIR/state.env"
MESSAGE_FILE="$STATE_DIR/slack-message.md"
mkdir -p "$STATE_DIR"

# shellcheck source=/dev/null
[ -f "$STATE_FILE" ] && . "$STATE_FILE"

# The state file replays the exports of an earlier run, so the current checkout
# has to win over whatever it recorded for the release arguments.
if [ "$ENV_SHA" != "$ENV_SHA_COMPUTED" ]; then
  warn "the recorded ENV_SHA differs from the current .env.production, the current file wins"
fi
ENV_SHA="$ENV_SHA_COMPUTED"
RELEASE_COMMIT="$RELEASE_COMMIT_RESOLVED"

# --- targets ----------------------------------------------------------------

TARGET_KEYS=()
CHECKED=()
for key in $ALL_TARGETS; do
  TARGET_KEYS+=("$key")
  prefix="$(target_prefix "$key")"
  existing_var="${prefix}_REQUEST_ID"
  if [ -n "${!existing_var:-}" ]; then CHECKED+=(0); else CHECKED+=(1); fi
done

if [ -f "$STATE_FILE" ]; then
  step "Earlier run found"
  say "  $STATE_FILE already holds requests for this tag:"
  for i in $(seq 0 $((${#TARGET_KEYS[@]} - 1))); do
    prefix="$(target_prefix "${TARGET_KEYS[$i]}")"
    existing_var="${prefix}_REQUEST_ID"
    [ -n "${!existing_var:-}" ] && note "$(target_label "${TARGET_KEYS[$i]}"): ${!existing_var}"
  done
  say "  Those are pre-deselected below. Re-select one only to file a second request for it."
fi

if [ -n "$TARGETS_ARG" ]; then
  for i in $(seq 0 $((${#TARGET_KEYS[@]} - 1))); do CHECKED[i]=0; done
  for wanted in $(echo "$TARGETS_ARG" | tr ',' ' '); do
    [ "$wanted" = "none" ] && continue
    found=0
    for i in $(seq 0 $((${#TARGET_KEYS[@]} - 1))); do
      if [ "${TARGET_KEYS[$i]}" = "$wanted" ]; then
        CHECKED[i]=1
        found=1
      fi
    done
    [ "$found" = "1" ] || die "unknown target: $wanted (known: $ALL_TARGETS)"
  done
else
  [ -t 0 ] || die "no terminal for the picker, pass --targets instead"
  choose_targets
fi

SELECTED=()
for i in $(seq 0 $((${#TARGET_KEYS[@]} - 1))); do
  [ "${CHECKED[$i]}" = "1" ] && SELECTED+=("${TARGET_KEYS[$i]}")
done
SKIP_RUN=0
if [ ${#SELECTED[@]} -eq 0 ]; then
  # Selecting nothing on a tag that already has requests just re-renders the message.
  [ -f "$STATE_FILE" ] || die "nothing selected"
  SKIP_RUN=1
  note "nothing selected, re-rendering the message from the recorded ids"
fi

if [ "$SKIP_RUN" = "0" ]; then

  # --- plan -------------------------------------------------------------------

  step "Plan"
  say "  Tag        $BOLD$TAG$RESET ($RELEASE_COMMIT)"
  say "  Station    $STATION ($STATION_ID)"
  say "  ENV_SHA    $ENV_SHA"
  say "  State      $STATE_DIR"
  say "  Canisters"
  for key in "${SELECTED[@]}"; do
    say "    - $(target_label "$key")"
  done
  say ""
  say "  Each canister is built in docker and then filed as a request on production."
  say "  This takes a while. Nothing is approved and nothing is deployed by this script."
  if [ "$ASSUME_YES" != "1" ]; then
    confirm "  File these requests on $STATION?" || die "aborted"
  fi

  # --- run --------------------------------------------------------------------

  git checkout --quiet "$TAG"
  ok "checked out $TAG"

  record() {
    printf 'export %s=%s\n' "$1" "$2" >>"$STATE_FILE"
    printf -v "$1" '%s' "$2"
  }

  DONE_TARGETS=()
  elapsed_since() {
    local seconds=$(($(date +%s) - $1))
    printf '%dm%02ds' $((seconds / 60)) $((seconds % 60))
  }

  fail_and_report() {
    local failed="$1" reason="$2" log="$3"
    printf '\n%s==> Stopped%s\n' "$BOLD$RED" "$RESET"
    say "  $reason"
    say "  Log: $log"
    say ""
    if [ ${#DONE_TARGETS[@]} -gt 0 ]; then
      say "  Requests already filed on production (they stay open, cancel them in Orbit if you abandon this release):"
      for key in "${DONE_TARGETS[@]}"; do
        prefix="$(target_prefix "$key")"
        id_var="${prefix}_REQUEST_ID"
        say "    - $(target_label "$key"): ${!id_var}"
      done
    else
      say "  No request was filed."
    fi
    say ""
    say "  Not done: $(target_label "$failed") and everything after it."
    say "  Ids so far are in $STATE_FILE. Re-run and the finished targets are pre-deselected."
    exit 1
  }

  total=${#SELECTED[@]}
  index=0
  for key in "${SELECTED[@]}"; do
    index=$((index + 1))
    label="$(target_label "$key")"
    prefix="$(target_prefix "$key")"
    build_log="$STATE_DIR/$key.build.log"
    request_log="$STATE_DIR/$key.request.log"

    step "[$index/$total] $label: build"
    note "$build_log"
    started="$(date +%s)"
    set +e
    run_build "$key" 2>&1 | tee "$build_log"
    status="${PIPESTATUS[0]}"
    set -e
    [ "$status" = "0" ] || fail_and_report "$key" "The $label build failed with exit code $status." "$build_log"
    ok "$label built in $(elapsed_since "$started")"

    step "[$index/$total] $label: request"
    note "$request_log"
    started="$(date +%s)"
    set +e
    run_request "$key" 2>&1 | tee "$request_log"
    status="${PIPESTATUS[0]}"
    set -e
    [ "$status" = "0" ] || fail_and_report "$key" "The $label request failed with exit code $status." "$request_log"

    request_id="$(grep -o 'Created request: [0-9a-f-]*' "$request_log" | tail -1 | awk '{print $3}')"
    [ -n "$request_id" ] || fail_and_report "$key" "The $label request reported success but printed no request id." "$request_log"
    record "${prefix}_REQUEST_ID" "$request_id"

    if [ "$key" != "backend" ]; then
      batch_id="$(grep -o 'Batch id: [0-9]*' "$request_log" | tail -1 | awk '{print $3}')"
      [ -n "$batch_id" ] || fail_and_report "$key" "The $label request printed no batch id." "$request_log"
      if [ "$key" = "frontend" ]; then
        record "BATCH_ID" "$batch_id"
      else
        record "${prefix}_BATCH_ID" "$batch_id"
      fi
    fi

    DONE_TARGETS+=("$key")
    ok "$label requested in $(elapsed_since "$started"): $request_id"
  done

  record "RELEASE_COMMIT" "$RELEASE_COMMIT"
  record "RELEASE_TAG" "$TAG"
  record "ENV_SHA" "$ENV_SHA"

fi

# --- message ----------------------------------------------------------------

count_word() {
  case "$1" in
  1) echo "one" ;;
  2) echo "two" ;;
  3) echo "three" ;;
  4) echo "four" ;;
  *) echo "$1" ;;
  esac
}

# Slack's composer converts a small markdown subset on paste: single-asterisk bold,
# "- " bullets, backticks and fences. Double asterisks are not part of it and would
# paste through literally.
# The message covers only what was actually filed, including on a resumed run.
FILED=()
for key in $ALL_TARGETS; do
  prefix="$(target_prefix "$key")"
  id_var="${prefix}_REQUEST_ID"
  [ -n "${!id_var:-}" ] && FILED+=("$key")
done

has_backend=0
has_frontend=0
for key in "${FILED[@]}"; do
  [ "$key" = "backend" ] && has_backend=1
  [ "$key" != "backend" ] && has_frontend=1
done
if [ "$has_backend" = "1" ] && [ "$has_frontend" = "1" ]; then
  what="backend and frontend"
elif [ "$has_backend" = "1" ]; then
  what="backend"
else
  what="frontend"
fi
if [ ${#FILED[@]} = 1 ]; then
  opening="There is one new request to update the OISY $what in Orbit."
else
  opening="There are $(count_word ${#FILED[@]}) new requests to update the OISY $what in Orbit."
fi

{
  echo "Dear reviewers,"
  echo ""
  echo "$opening Can you please review them and consider voting?"
  echo ""
  for key in "${FILED[@]}"; do
    prefix="$(target_prefix "$key")"
    id_var="${prefix}_REQUEST_ID"
    id="${!id_var}"
    echo "- *$(target_label "$key"):*"
    echo "  - URL: https://orbitwallet.io?reqid=$id&sid=$STATION_ID"
    echo "  - To view the request, run: \`dfx-orbit review id $id\`"
  done
  echo ""
  echo "*Technical checks:* @Antonio Ventilii @Denys Karmazyn"
  echo ""
  echo "- The release arguments are:"
  echo ""
  echo '```'
  echo "export RELEASE_COMMIT=$RELEASE_COMMIT"
  echo "export RELEASE_TAG=$TAG"
  for key in "${FILED[@]}"; do
    prefix="$(target_prefix "$key")"
    id_var="${prefix}_REQUEST_ID"
    echo "export ${prefix}_REQUEST_ID=${!id_var}"
  done
  for key in "${FILED[@]}"; do
    [ "$key" = "backend" ] && continue
    prefix="$(target_prefix "$key")"
    if [ "$key" = "frontend" ]; then batch_var="BATCH_ID"; else batch_var="${prefix}_BATCH_ID"; fi
    echo "export $batch_var=${!batch_var}"
  done
  [ "$has_frontend" = "1" ] && echo "export ENV_SHA=\"$ENV_SHA\""
  echo '```'
  echo ""
  echo "- Please verify that the release commit corresponds to tag \`$TAG\` ([release docs](https://github.com/dfinity/oisy-wallet/releases/tag/$TAG))"
  if [ "$has_frontend" = "1" ]; then
    echo "- Please verify that the ENV_SHA corresponds to \`sha256sum .env.production\`. The env file should match the values in 1pass."
    echo "- Please verify that the env file is correct. In particular, that the feature flags are set to the correct values."
  fi
  echo "- Please verify that the request corresponds to the above parameters by following the instructions here: [OISY Orbit guide]($GUIDE_URL)"
  echo ""
  echo "*Feature developers:*"
  echo ""
  echo "- Please provide guidance in this thread on what features have changed."
  echo ""
  echo "*Product owners:* @Stefan Berger @Pierre Samaties"
  echo ""
  echo "- This release can be previewed on beta.oisy.com"
} >"$MESSAGE_FILE"

step "Done"
say "  All ${#FILED[@]} requests are open on $STATION."
say ""
cat "$MESSAGE_FILE"
say ""
if command -v pbcopy >/dev/null 2>&1; then
  pbcopy <"$MESSAGE_FILE"
  ok "copied to the clipboard, paste it into #eng-oisy-release"
elif command -v xclip >/dev/null 2>&1; then
  xclip -selection clipboard <"$MESSAGE_FILE"
  ok "copied to the clipboard, paste it into #eng-oisy-release"
fi
say "  Message: $MESSAGE_FILE"
say "  State:   $STATE_FILE"
say ""
say "  The @mentions paste as plain text. Retype them in Slack so they resolve."
