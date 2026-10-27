---
title: 'Handoff: implementing the iOS native MVP'
tags: [ios, native, handoff, historical]
---

# Handoff: implementing the iOS native MVP

This experiment was superseded by the shared-web Capacitor app on 2026-10-27.
The original spec, brief, decisions and UI plan record the earlier design; they
are not instructions to restore the retired Swift wallet.

## Outcome

The native experiment established simulator/device builds, Internet Identity
sign-in and real audit balances. Its independent wallet screens, balance pipeline,
generated bindings and native SDK dependency were then removed at the user's
request. The retained native responsibilities are system sign-in, Keychain,
navigation and the isolated Explore browser. Wallet, Token, Activity and Notes
now use the existing Svelte frontend and shared data/authentication pipeline.

Explore supports origin-bound account connection and Sepolia public reads.
Transaction signing and swaps were not completed; the original M5 goal remains
unimplemented. Earlier mock-screen screenshots do not prove live wallet behavior.
Current device acceptance and regression results belong to the migration handoff.

## Local archive

The chronological implementation diary is retained locally at
`evidence/historical-handoff-20261027.txt`, alongside the retired screenshots/logs.
That archive is deliberately excluded from review commits. It contains obsolete
paths, temporary build results and intermediate plans; do not use it as a build guide.
The repository keeps the original spec and decision history.

## Related

| Document                                                                               | Purpose                                               |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [Capacitor guide](../../../../../mobile/capacitor/README.md)                           | Current project, setup and authentication review      |
| [Migration handoff](../2026-10-27-feat-mobile-shared-web-native-navigation/handoff.md) | Current implementation, validation and remaining work |
| [Decisions](./decisions.md)                                                            | Historical choices and their supersession             |
