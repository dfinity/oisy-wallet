This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec — 1Sec restricted to the unwrapping direction

- **Improvement:** stop offering swaps that move a user _into_ a 1Sec-bridged position, keep the way back out, and tell holders of a bridged balance that it is there
- **Status:** in implementation (Claude Code)

## 1. Motivation

OISY is winding the 1Sec (OneSec) integration down to its exit path only. Most of the tokens it
added have already left the curated set (#13538, #13539 marked them metadata-only), but that
only stops _new_ users from discovering them — it does nothing about two live problems:

1. The swap flow still quotes both directions, so a user can still be routed into a fresh
   bridged position.
2. Users already hold balances in these tokens. The wrapped ERC-20 of ICP in particular cannot
   simply be dropped: it was added as a **suggested** token on Ethereum, Base and Arbitrum
   (`ERC20_SUGGESTED_TOKENS` in `src/frontend/src/env/tokens/tokens.erc20.env.ts`), so a holder
   may never have added it to their custom-token list. Removing it from the curated set would
   hide the balance instead of helping them move it.

## 2. Scope

- Offer only the leg of each 1Sec pair that returns a token to the chain it is native to.
- Warn users who hold a non-zero balance in a 1Sec-bridged token that they should swap it back.

### Out of scope

- Hiding, disabling, demoting or removing any token. Every affected token stays exactly as
  visible as it is today — that visibility is what lets a holder act.
- Changing which tokens 1Sec accepts as a **pay** token. Only the destinations offered for a
  given pay token change.
- Any change to Chain Fusion, the IC DEXes, Velora or NEAR Intents.
- Adding CHAT to the integration (see [§5](#5-facts-established-against-the-live-canister)).

## 3. Approach

### 3.1 The direction rule

1Sec wraps in **both** directions, so "unwrap" is per token, not per chain. The
`onesec-bridge` config records which chain each token is native to in `evmMode`:

| `evmMode` | Native chain | Wrapped side                         | Leg to keep   |
| --------- | ------------ | ------------------------------------ | ------------- |
| `minter`  | ICP          | ERC-20 on Ethereum / Base / Arbitrum | **EVM → ICP** |
| `locker`  | EVM          | ICRC ledger on ICP                   | **ICP → EVM** |

So ICP, BOB, GLDT and ckBTC may only be swapped EVM → ICP, and USDC, USDT and cbBTC may only be
swapped ICP → EVM. This is read from the config rather than hardcoded as a token list, so a
token 1Sec adds later is classified correctly without a code change.

### 3.2 Where it is enforced

One place: `oneSecCompatibleDestinations` in `src/frontend/src/lib/utils/onesec-swap.utils.ts`.
It is the provider's `getSupportedDestinations`, and it already feeds every consumer that needs
to agree — `computeReceiveSupportedTokens` builds the destination token list from it, and
`networksWithSupport` narrows the destination **network** filter from the same data. Returning
no destinations for the wrapping leg therefore removes the pair from the token list _and_ the
networks that pair was the only route to, with no second enforcement point to keep in sync.

The pay-side lists (`oneSecIcpSupportedTokens`, `oneSecEvmSupportedTokens`) are deliberately
left alone. Narrowing them could only ever _hide_ a disabled token from the pay list, which is
the opposite of the goal; leaving them broad costs nothing, because the directed pair is what
enforces direction.

Guarded by a code-level kill switch `ONESEC_UNWRAP_ONLY` (`src/frontend/src/env/rest/onesec.env.ts`),
matching the existing `*_PROVIDER_ENABLED` convention, so both directions can be restored by
flipping one const if both directions are wanted again.

### 3.3 The warning

A dismissible warning banner, shown whenever the user holds a non-zero balance in any
1Sec-bridged token, telling them to swap it back. Built on the existing `WarningBanner` and
mounted app-level in the same manner as `AgreementsBanner`, so it is seen without the user
having to open the affected token.

The banner's token set is the **wrapped** side only — the ERC-20s of ICP / BOB / GLDT on the
three EVM chains, and the 1Sec ICRC USDC (`53nhb-haaaa-aaaar-qbn5q-cai`) and USDT
(`ij33n-oiaaa-aaaar-qbooa-cai`) on ICP. **CHAT is excluded**: no user could ever have acquired
wrapped CHAT through OISY, so warning about it would be noise.

## 4. PR split

| PR   | Contents                                                                     |
| ---- | ---------------------------------------------------------------------------- |
| PR-1 | `ONESEC_UNWRAP_ONLY`, the direction gate, its tests, this spec, `PRODUCT.md` |
| PR-2 | The warning banner, its derived store, tests and i18n                        |

PR-1 carries no i18n and no UI, so it can merge as soon as it is reviewed; PR-2 stacks on it.

## 5. Facts established against the live canister

Queried directly (`5okwm-giaaa-aaaar-qbn6a-cai`, `get_metadata` / `get_paused_endpoints`),
because the npm package's static config turned out not to match the deployed bridge:

- 1Sec **does** still bridge CHAT, on all three EVM chains plus ICP ledger
  `2ouva-viaaa-aaaaq-aaamq-cai`. It also bridges YUSAN, which OISY does not carry.
- `onesec-bridge` has **never** shipped CHAT, in any published version (0.8.0 → 0.13.0), and
  its candid `Token` variant cannot encode it. CHAT is therefore unreachable in OISY in either
  direction and needs an upstream package release, not a local config addition. Tracked
  separately; nothing in this spec depends on it.
- No endpoints were paused at the time of writing, so a bridge-side pause is not a signal the
  wallet could key this restriction off.
- The canister's `locker` field agrees with the package's `evmMode` for every token the package
  does carry, which is what makes [§3.1](#31-the-direction-rule) safe to rely on.

## 6. `PRODUCT.md`

New section under `## Swap`: **1Sec restricted to the unwrapping direction** — the rule, the
per-token table, that only 1Sec is affected, the three tokens with no practical effect
(CHAT, ckBTC, cbBTC), the explicit non-goals, and the kill switch. Landed in PR-1.

## 7. Tests

- The direction gate, per token and per direction: the wrapping leg returns no destinations and
  the unwrapping leg still returns its destination, for a `minter` token and a `locker` token
  each; plus the `ONESEC_UNWRAP_ONLY = false` path restoring both.
- The pre-existing `oneSecCompatibleDestinations` tests that asserted a now-closed leg are
  realigned rather than deleted, and the "unknown address" and "no address on this network"
  fallbacks are left asserting their existing behaviour.
- Banner: shown only with a non-zero bridged balance, absent at zero balance, absent for a
  non-1Sec token with a balance, dismissible, and CHAT excluded.
