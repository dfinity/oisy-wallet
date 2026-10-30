# Handoff: implementing the iOS native MVP

Written 2026-10-22 for the agent that implements
[`../2026-10-22-feat-ios-native-mvp.md`](../2026-10-22-feat-ios-native-mvp.md).

## Read first

1. `AGENTS.md` at the repo root.
2. The spec, then [`brief.md`](./brief.md): its Acceptance list and state table are what "done" means.
3. [`decisions.md`](./decisions.md). Append one line per decision the user makes, with a timestamp.

## Before you start

- **Pending decisions D1–D4** (spec, last section). They need the user's call before M1, unless the
  prompt that started you already gives it.
- **Branches:**
  - Work on a new branch made from `claude/iphone-app-support-5de37c`, which holds this spec.
  - Read the two proof-of-concept branches with `git show <branch>:<path>`, without checking them out:
    `claude/mobile-app-architecture-1d1cde` (draft PR #13512, owned by Antonio Ventilii) and
    `claude/oisy-browser-extension-signing-d11866` (draft PR #14306).
- Push nothing unless the user asks.

## This Mac

- **Xcode:** Xcode 26.2 is at `/Applications/Xcode.app`, but `xcode-select -p` points to Command Line
  Tools. Prefix Xcode commands with `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`, or ask
  the user to run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
- **Simulators:** iOS 26.2 runtime with the iPhone 17, iPhone Air and iPhone 16e.
- **XcodeGen:** installed at `/opt/homebrew/bin/xcodegen`.
- **Node:** the shell defaults to an old Node. Use `~/.nvm/versions/node/v24.15.0/bin/node` for the
  EIP-712 vector script and the test dApp.
- **One heavy job at a time.** The laptop freezes when `xcodebuild`, the simulator, test runs and dev
  servers run in parallel. Run them one after another.
- **`dfx`** is at `~/Library/Application Support/org.dfinity.dfx/bin/dfx`. Use it for anonymous
  queries against audit, for example:
  `dfx canister call --ic --query --identity anonymous --candid src/backend/backend.did vhcnk-oqaaa-aaaah-araya-cai exchange_rate_enabled '()'`
  returned `(true)` on 2026-10-22.

## Test dApp

The extension's test dApp lives only on `claude/oisy-browser-extension-signing-d11866`. Export it
without checking that branch out:

```bash
mkdir -p /tmp/oisy-test-dapp && git archive claude/oisy-browser-extension-signing-d11866 src/extension | tar -x -C /tmp/oisy-test-dapp
```

```bash
~/.nvm/versions/node/v24.15.0/bin/node /tmp/oisy-test-dapp/src/extension/test-dapp/serve.js
```

It serves `http://localhost:8090`, which the simulator reaches as well.

## Things only the user can do

- Sign in with their Internet Identity (passkey) in the simulator.
- Fund their audit ETH address with Sepolia ETH from a faucet, for the send and Uniswap checks.
- Check whether they are on Apple team `7FY8G6QYKD` (open question O1). Until then, use the one-tap
  relay sign-in.

## Before saying done

Reread the brief's Acceptance list and state table, and report each item as met or not met, with the
evidence the brief asks for. Save the evidence under `./evidence/`.
