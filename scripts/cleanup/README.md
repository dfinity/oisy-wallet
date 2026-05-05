# Stale remote branch cleanup

Tooling to delete branches on `origin` that are abandoned.

## What counts as "stale"

A branch is added to a manifest only if, on the audit date:

- it had **no open or draft pull request** on GitHub (`gh api repos/.../pulls?state=open`), and
- its **tip commit** (committer date) was older than the cutoff — i.e. no commits, force-pushes or rebases in that window.

The audit excludes `main` and any branch with a live, open PR.

Two manifests are shipped:

| File | Cutoff | Audited on | # branches |
|---|---|---|---|
| `stale-branches-2026-05-05.tsv` | 6 months (≤ 2025-11-05) | 2026-05-05 | 250 |
| `stale-branches-3-months-2026-05-05.tsv` | 3 months (≤ 2026-02-05) | 2026-05-05 | 25 |

The 3-month manifest is fully disjoint from the 6-month one — once you've run the 6-month cleanup the additional branches it covers are those with their last commit between 2025-11-05 and 2026-02-05.

## Files

- `stale-branches-2026-05-05.tsv` — 6-month manifest.
- `stale-branches-3-months-2026-05-05.tsv` — 3-month manifest.
- `delete-stale-remote-branches.sh` — deletion script. Defaults to dry-run and to the 6-month manifest. Pass `--manifest <path>` to use a different one.

## How to run

```bash
# Show what would be deleted (no changes) using the 6-month manifest:
./scripts/cleanup/delete-stale-remote-branches.sh

# Actually delete those branches from origin:
./scripts/cleanup/delete-stale-remote-branches.sh --yes

# Same flow with the 3-month manifest:
./scripts/cleanup/delete-stale-remote-branches.sh \
  --manifest scripts/cleanup/stale-branches-3-months-2026-05-05.tsv
./scripts/cleanup/delete-stale-remote-branches.sh --yes \
  --manifest scripts/cleanup/stale-branches-3-months-2026-05-05.tsv
```

Useful flags:

- `--remote <name>` — push deletions to a remote other than `origin`.
- `--manifest <path>` — use a different manifest file.
- `--skip-pr-check` — don't query GitHub for open PRs (script will still skip moved branches).

## Safety nets

The script applies these checks at runtime, in addition to the audit-time filters:

1. **Default dry-run.** You must pass `--yes` to actually push deletions.
2. **Tip-SHA check.** Before deleting a branch, the script compares the live remote tip against the SHA recorded in the manifest. If they differ (meaning the branch was force-pushed or had new commits since the audit), the branch is skipped.
3. **Live PR check.** If `gh` is installed and authenticated, branches with an open PR right now are skipped (covers PRs opened after the audit).
4. **Protected-branch list.** `main`, `master`, `develop`, `release` and `HEAD` are hard-coded as protected.

## Re-generating the manifest

The audit was an ad-hoc pipeline; if you need to refresh it, the gist is:

```bash
git fetch --all --prune

# 1. branches with last commit older than 6 months
git for-each-ref \
  --format='%(committerdate:iso8601)|%(refname:short)|%(objectname)' \
  refs/remotes/origin |
  awk -F'|' -v cutoff="$(date -u -d '6 months ago' '+%Y-%m-%d')" \
    '$1 < cutoff { sub(/^origin\//,"",$2); print $2"\t"substr($1,1,10)"\t"$3 }' \
  > /tmp/old.tsv

# 2. branches with an open or draft PR (drafts are returned by state=open)
gh api -X GET 'repos/dfinity/oisy-wallet/pulls?state=open&per_page=100' \
  --paginate -q '.[].head.ref' | sort -u > /tmp/pr_branches.txt

# 3. subtract
LC_ALL=C sort -t$'\t' -k1 /tmp/old.tsv -o /tmp/old.tsv
LC_ALL=C comm -23 \
  <(awk -F'\t' '{print $1}' /tmp/old.tsv) \
  /tmp/pr_branches.txt \
  > /tmp/keys.txt
LC_ALL=C join -t$'\t' -1 1 -2 1 \
  /tmp/keys.txt /tmp/old.tsv \
  > scripts/cleanup/stale-branches-$(date -u +%F).tsv
```
