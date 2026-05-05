#!/usr/bin/env bash
# Delete stale remote branches from `origin` (default: dfinity/oisy-wallet).
#
# A branch is "stale" if, at the time the manifest was generated:
#   - it has no open or draft pull request, AND
#   - its tip commit is older than 6 months (committer date),
#     i.e. the branch has had no activity, including rebases or force-pushes,
#     in the last 6 months.
#
# The audit was run on 2026-05-05 against the dfinity/oisy-wallet repo. The
# resulting list (250 branches) is stored in:
#   scripts/cleanup/stale-branches-2026-05-05.tsv
#
# File format (TAB-separated):
#   <branch_name>\t<last_commit_date>\t<recorded_sha>
#
# Safety nets enforced at runtime:
#   1. Default mode is DRY-RUN. Pass --yes to actually delete.
#   2. Before deleting, the script re-reads `git ls-remote` and skips any
#      branch whose remote tip differs from the recorded SHA (someone pushed
#      to it after the audit -> not stale anymore).
#   3. If `gh` is available and authenticated, the script also skips any
#      branch that currently has an open PR (catches PRs opened after the
#      audit).
#   4. The protected branch `main` (and a configurable list of others) can
#      never be deleted by this script.
#
# Usage:
#   scripts/cleanup/delete-stale-remote-branches.sh                  # dry-run
#   scripts/cleanup/delete-stale-remote-branches.sh --yes            # delete
#   scripts/cleanup/delete-stale-remote-branches.sh --yes --remote upstream
#   scripts/cleanup/delete-stale-remote-branches.sh --manifest path.tsv
#   scripts/cleanup/delete-stale-remote-branches.sh --skip-pr-check  # skip gh
#
# Exit codes:
#   0  success (or dry-run completed)
#   1  bad args / missing dependencies
#   2  manifest not found

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_MANIFEST="${SCRIPT_DIR}/stale-branches-2026-05-05.tsv"

REMOTE="origin"
MANIFEST="${DEFAULT_MANIFEST}"
APPLY=0
SKIP_PR_CHECK=0
PROTECTED_BRANCHES=("main" "master" "develop" "release" "HEAD")

usage() {
  sed -n '2,40p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -y|--yes|--apply) APPLY=1; shift ;;
    --remote) REMOTE="$2"; shift 2 ;;
    --manifest) MANIFEST="$2"; shift 2 ;;
    --skip-pr-check) SKIP_PR_CHECK=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ ! -f "${MANIFEST}" ]]; then
  echo "Manifest file not found: ${MANIFEST}" >&2
  exit 2
fi

command -v git >/dev/null || { echo "git is required" >&2; exit 1; }

if [[ ${APPLY} -eq 0 ]]; then
  echo "=== DRY RUN === (pass --yes to actually delete)"
else
  echo "=== APPLY === Branches will be deleted from remote '${REMOTE}'."
fi

echo "Manifest: ${MANIFEST}"
echo "Remote:   ${REMOTE}"
echo

echo "Fetching current remote tips..."
declare -A REMOTE_TIPS=()
while read -r sha ref; do
  [[ -z "${ref:-}" ]] && continue
  case "${ref}" in
    refs/heads/*) REMOTE_TIPS["${ref#refs/heads/}"]="${sha}" ;;
  esac
done < <(git ls-remote --heads "${REMOTE}")

OPEN_PR_BRANCHES=""
if [[ ${SKIP_PR_CHECK} -eq 0 ]] && command -v gh >/dev/null 2>&1; then
  echo "Querying open PRs via gh..."
  if OPEN_PR_BRANCHES="$(gh pr list --state open --limit 1000 --json headRefName -q '.[].headRefName' 2>/dev/null)"; then
    :
  else
    echo "Warning: 'gh pr list' failed; skipping live PR check." >&2
    OPEN_PR_BRANCHES=""
    SKIP_PR_CHECK=1
  fi
else
  echo "Skipping live PR check (gh missing or --skip-pr-check given)."
fi
echo

is_protected() {
  local b="$1"
  for p in "${PROTECTED_BRANCHES[@]}"; do
    [[ "$b" == "$p" ]] && return 0
  done
  return 1
}

has_open_pr() {
  local b="$1"
  [[ ${SKIP_PR_CHECK} -eq 1 ]] && return 1
  grep -Fxq -- "$b" <<<"${OPEN_PR_BRANCHES}"
}

TO_DELETE=()
SKIPPED_NOT_FOUND=()
SKIPPED_MOVED=()
SKIPPED_HAS_PR=()
SKIPPED_PROTECTED=()

while IFS=$'\t' read -r BRANCH DATE EXPECTED_SHA; do
  [[ -z "${BRANCH:-}" ]] && continue
  [[ "${BRANCH}" == \#* ]] && continue

  if is_protected "${BRANCH}"; then
    SKIPPED_PROTECTED+=("${BRANCH}")
    continue
  fi

  CURRENT_SHA="${REMOTE_TIPS[${BRANCH}]:-}"
  if [[ -z "${CURRENT_SHA}" ]]; then
    SKIPPED_NOT_FOUND+=("${BRANCH}")
    continue
  fi

  if [[ -n "${EXPECTED_SHA}" && "${CURRENT_SHA}" != "${EXPECTED_SHA}" ]]; then
    SKIPPED_MOVED+=("${BRANCH} (was ${EXPECTED_SHA:0:7}, now ${CURRENT_SHA:0:7})")
    continue
  fi

  if has_open_pr "${BRANCH}"; then
    SKIPPED_HAS_PR+=("${BRANCH}")
    continue
  fi

  TO_DELETE+=("${BRANCH}")
done < "${MANIFEST}"

echo "Plan:"
echo "  to delete:        ${#TO_DELETE[@]}"
echo "  skipped (moved):  ${#SKIPPED_MOVED[@]}"
echo "  skipped (no ref): ${#SKIPPED_NOT_FOUND[@]}"
echo "  skipped (PR):     ${#SKIPPED_HAS_PR[@]}"
echo "  skipped (protect):${#SKIPPED_PROTECTED[@]}"
echo

if [[ ${#SKIPPED_MOVED[@]} -gt 0 ]]; then
  echo "Branches changed since audit -> NOT deleting:"
  printf '  - %s\n' "${SKIPPED_MOVED[@]}"
  echo
fi
if [[ ${#SKIPPED_HAS_PR[@]} -gt 0 ]]; then
  echo "Branches with an open PR right now -> NOT deleting:"
  printf '  - %s\n' "${SKIPPED_HAS_PR[@]}"
  echo
fi
if [[ ${#SKIPPED_NOT_FOUND[@]} -gt 0 ]]; then
  echo "Branches no longer present on remote -> nothing to delete:"
  printf '  - %s\n' "${SKIPPED_NOT_FOUND[@]}"
  echo
fi

if [[ ${#TO_DELETE[@]} -eq 0 ]]; then
  echo "Nothing to do."
  exit 0
fi

if [[ ${APPLY} -eq 1 ]]; then
  echo "The following branches will be deleted from '${REMOTE}':"
else
  echo "The following branches are candidates for deletion on '${REMOTE}':"
fi
printf '  - %s\n' "${TO_DELETE[@]}"
echo

if [[ ${APPLY} -eq 0 ]]; then
  echo "(Dry-run only. Re-run with --yes to delete.)"
  exit 0
fi

# Delete in batches of 50 to keep the push command size sane.
BATCH_SIZE=50
TOTAL=${#TO_DELETE[@]}
START=0
DELETED=0
FAILED=()

while [[ ${START} -lt ${TOTAL} ]]; do
  END=$(( START + BATCH_SIZE ))
  [[ ${END} -gt ${TOTAL} ]] && END=${TOTAL}
  BATCH=("${TO_DELETE[@]:START:END-START}")
  echo ">>> Deleting batch $((START/BATCH_SIZE + 1)) (${#BATCH[@]} branches)..."
  REFSPECS=()
  for b in "${BATCH[@]}"; do
    REFSPECS+=(":refs/heads/${b}")
  done
  if git push "${REMOTE}" "${REFSPECS[@]}"; then
    DELETED=$(( DELETED + ${#BATCH[@]} ))
  else
    echo "Batch failed; retrying branches one by one..." >&2
    for b in "${BATCH[@]}"; do
      if git push "${REMOTE}" --delete "${b}"; then
        DELETED=$(( DELETED + 1 ))
      else
        FAILED+=("${b}")
      fi
    done
  fi
  START=${END}
done

echo
echo "Deleted: ${DELETED} / ${TOTAL}"
if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "Failed (${#FAILED[@]}):"
  printf '  - %s\n' "${FAILED[@]}"
  exit 1
fi
