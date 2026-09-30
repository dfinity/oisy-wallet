> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: XRP Ledger trust-line tokens (RLUSD and imported tokens)

- **Type:** `feat`
- **Area:** Backend (custom-token, token-id and active-user-transaction variants); frontend (`$xrp` balances, adding and removing a token, send, history, prices, Manage tokens); provider configuration (the QuickNode method whitelist)
- **Status:** Draft. All decisions resolved (§10); two open questions (§8).

---

## 1. Motivation

OISY has supported native XRP on the XRP Ledger (XRPL) since #13597 (merged 2026-09-21), but no other asset on that ledger: Manage tokens → Import token → XRP Ledger says "OISY does not support custom tokens on this network yet." (#14158, merged 2026-09-29).

The first token this spec lists is **RLUSD**, Ripple's USD stablecoin, which is issued on XRPL as a trust-line token. Measured on 2026-09-29:

| Fact                      | Value                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Currency code             | `524C555344000000000000000000000000000000` (the ASCII of "RLUSD", zero-padded to 160 bits)                                    |
| Issuer                    | `rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De` (AccountRoot `Domain` = `https://ripple.com/`)                                           |
| Outstanding               | 1,121,371,354 RLUSD (`gateway_balances` obligations)                                                                          |
| Issuer flags              | `0x819a0000`: AllowTrustLineClawback, DepositAuth, DefaultRipple, DisableMaster, DisallowXRP, RequireDestTag                  |
| Not set                   | NoFreeze (so the issuer can freeze and deep-freeze holders), RequireAuth (no approval needed), `TransferRate` (no fee)        |
| Price                     | CoinGecko `ripple-usd`; `simple/token_price/xrp` returns $1.00 for the key `524C5553…0000.rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De` |
| A frozen holder, on-chain | one RLUSD trust line in the first five `account_lines` rows carries `freeze: true` and `deep_freeze: true`                    |
| Redeeming to the issuer   | `deposit_authorized` answers `false` for an ordinary holder: DepositAuth makes the issuer refuse its holders' payments        |

The XRP integration spec left tokens out on purpose — "IOUs are a materially different token model (trust lines, authorization, freezing) and would roughly double this scope" (`2026-07-24-feat-xrp-ledger-integration.md` §3). This spec is that follow-up, restricted to trust-line tokens.

## 2. What an XRPL token is, and why it is not an ERC-20

|                         | ERC-20 / SPL in OISY                          | XRPL trust-line token                                                                           |
| ----------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Identity                | contract or mint address                      | currency code **and** issuer address; anyone can issue a token whose code is `RLUSD`            |
| Adding it               | Import token saves the address in the backend | the holder's account must sign a `TrustSet` transaction before it can hold or receive the token |
| Cost of adding          | nothing                                       | a network fee, and 0.2 XRP of the holder's balance becomes reserved while the token stays added |
| Tokens nobody asked for | anyone can send any token (spam)              | impossible: nothing arrives without the holder's trust line                                     |
| Amounts                 | integer with fixed decimals                   | decimal floating point with 15 significant digits                                               |
| On-chain metadata       | name, symbol, decimals                        | none: no name, no decimals, no logo                                                             |
| Issuer powers           | whatever the contract implements              | protocol flags: freeze, deep freeze, clawback, approval of holders, transfer fee                |

### 2.1 Identity

A currency code is either exactly 3 ASCII characters (a standard code: case-sensitive, and `XRP` is disallowed) or 40 hex characters (a 160-bit nonstandard code, which issuers fill with the ASCII of a longer name, as RLUSD does). A token is the pair (currency code, issuer). OISY identifies tokens by their on-chain address within a network, never by symbol; for XRPL that address is the pair.

### 2.2 Holding a token takes a transaction and a reserve

- A `TrustSet` creates a trust line — a ledger object between the holder and the issuer, with a limit on how much the holder accepts.
- The reserve, read from `server_info` on 2026-09-29: 1 XRP base plus 0.2 XRP per object the account owns. The ledger waives the owner reserve **when creating** a trust line while the account owns fewer than two objects (rippled `TrustSet.cpp`: `reserveCreate = (uOwnerCount < 2) ? 0 : accountReserve(…, ownerCountDelta = 1)`). The waiver ends at creation: once the line exists it counts. An account holding 1.00002 XRP can add RLUSD and is then below its 1.2 XRP reserve, so it cannot send XRP until it receives more.
- The account must exist on the ledger. A never-funded address has no account there, so a `TrustSet` from it cannot apply (`account_info` and `account_lines` both answer `actNotFound`).
- rippled sets the NoRipple flag on the creator's side of a new line only when the `TrustSet` asks for it (`tfSetNoRipple`; `RippleStateHelpers.cpp` `trustCreate`). For an account without DefaultRipple — every OISY account — NoRipple set is also that side's default state.
- A trust line is deleted, and its reserve released, when both sides are in their default state (`TrustSet.cpp`: no quality, NoRipple matching the account's DefaultRipple, no freeze, zero limit, no positive balance). The holder reaches that state with a `TrustSet` of limit 0 at a zero balance; the issuer's side is normally already there, unless the issuer froze the line or set a limit or quality on its own side.

### 2.3 Issuer powers

| Issuer setting                           | What it means for the holder                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Individual freeze (on the holder's line) | can only send to the issuer; can still receive. Impossible once the issuer set NoFreeze                                        |
| Global freeze (`lsfGlobalFreeze`)        | every holder can only send to the issuer                                                                                       |
| Deep freeze (on the holder's line)       | can neither send nor receive. The `DeepFreeze` amendment is enabled on mainnet (checked 2026-09-29)                            |
| NoFreeze (`lsfNoFreeze`)                 | the issuer gave up individual and deep freeze, permanently                                                                     |
| Clawback (`lsfAllowTrustLineClawback`)   | the issuer can take tokens back from any holder's line (`Clawback` amendment enabled)                                          |
| Approval (`lsfRequireAuth`)              | the holder can create the line but cannot hold or receive the token until the issuer authorizes it; authorization is permanent |
| Transfer fee (`TransferRate`)            | 0–100 %, charged on transfers between holders (not to or from the issuer); the sender pays and the fee is burned               |
| DefaultRipple off                        | holders cannot send the token to each other: rippled sets NoRipple on the issuer's side of every new line                      |
| DisallowIncomingTrustline                | no new trust lines accepted (`tecNO_PERMISSION`)                                                                               |

### 2.4 Amounts

A token amount is a decimal string, possibly in exponent notation: the live `account_lines` response returns limits such as `5800000000000000e13` and `1000000000000000e-3`. Precision is 15 significant digits over a range of 1e-81 to 9999999999999999e80 (xrpl.org, Currency Formats); the repo's `ripple-binary-codec` 2.8.0 throws "Decimal precision out of range" beyond 16.

### 2.5 An undeliverable payment still costs its fee

The ledger does not refuse a token payment it cannot deliver for free: it applies it as a failure, destroying the fee and consuming the sequence. A recipient without a trust line fails as `tecPATH_DRY` (rippled `Payment.cpp`: a failed path search "claim[s] a fee instead"); a recipient account that does not exist fails as `tecNO_DST`, because a token payment cannot create an account; a missing destination tag fails as `tecDST_TAG_NEEDED`, as it does for XRP. A frozen line, an unauthorized recipient, a recipient limit that is too low, a transfer fee the sender did not cover, and a DepositAuth recipient that has not preauthorized the sender (`verifyDepositPreauth` in `Payment.cpp`) fail the same way.

### 2.6 What moved in a transaction

The transaction metadata records every trust line a transaction changed (`AffectedNodes` → `RippleState`, with `Balance` stated from the low account's side). Checked on live RLUSD payments: a holder-to-holder payment of 0.001317 RLUSD modifies the sender's and the recipient's lines by exactly that amount. `delivered_amount` repeats the currency and issuer the payment asked for; the metadata says which of the user's lines actually changed, and by how much.

### 2.7 Prices

CoinGecko lists RLUSD as `ripple-usd`. Its `xrp` asset platform prices tokens by a contract key, but only 39 coins carry one, spelled inconsistently: 19 as `<hex code>.<issuer>`, the rest as `<3-character code>.<issuer>`, a decoded name (`Equilibrium.rpakCr61Q92abPXJnVboKENmpKssWyHpwu`) or the bare issuer address. Checked on 2026-09-29, `simple/token_price/xrp` prices both of the first two forms (RLUSD at $1.00, `CTF.r9Xzi4KsSF1Xtr8WHyBmUcvfP9FzTyG5wp` at $0.0105) and answers a bare-issuer key with an empty object. Most imported tokens will have no price.

## 3. What exists already

On `main` at `a339d4842`.

### 3.1 The ledger side

- **Native XRP only.** `mapXrpTransaction` drops every non-`Payment` transaction and every payment whose amount is not a drops string (`src/frontend/src/xrp/utils/xrp-transaction.utils.ts:183`). History is one `account_tx` page of `WALLET_PAGINATION` (10) rows per poll (`src/frontend/src/xrp/schedulers/xrp-wallet.scheduler.ts:118`).
- **The reserve already counts owned objects.** `getXrpReserveDrops` adds `XRP_OWNER_RESERVE_DROPS` per `OwnerCount` (`src/frontend/src/xrp/utils/xrp-send.utils.ts:15`, constants in `src/frontend/src/xrp/constants/xrp.constants.ts:6,15`), so the XRP send form stays correct once an account holds trust lines.
- **Recipient checks.** Before signing, `sendXrp` checks the recipient's existence against the reserve and its RequireDestTag flag (`XRP_ACCOUNT_FLAG_REQUIRE_DEST_TAG`, `xrp.constants.ts`). DepositAuth is not checked, for XRP either: an XRP payment to such an account is signed and applies as a failure that keeps its fee.
- **The RPC endpoint cannot list trust lines.** The QuickNode endpoint's method whitelist, as configured on 2026-09-18, has 8 entries (`account_info`, `account_tx`, `fee`, `ledger`, `ledger_current`, `submit`, `tx`, `server_info`); neither `account_lines` nor `deposit_authorized` is one of them. Public Clio (`s1.ripple.com`) answers both, `account_lines` including the `peer` filter.
- **No OISY account holds a trust line.** Only OISY can sign for the derived address, and nothing in OISY has ever sent a `TrustSet`. There is no existing state to migrate.

### 3.2 Paths a trust-line token would silently take today

A token of a new standard compiles without any other change, and then falls through code written for native XRP or for other chains. None of these is a compile error:

| Where                                                                                                                                         | What happens to a trust-line token                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `XrpLoaderWallets.svelte` → `WalletWorkers` → `loadWorker` (`src/frontend/src/lib/utils/wallet.utils.ts`)                                     | one `XrpWalletWorker` per token id, each polling `account_info` for the address: a second worker writes the account's **XRP** balance and history under the token's id |
| `SendWizard.svelte` → `XrpSendTokenWizard.svelte`                                                                                             | routed by network; the wizard fixes the fee token, the decimals and the sendability check to native XRP, and `buildXrpPayment` writes a drops `Amount`                 |
| `TokenMenu.svelte` `hideToken`                                                                                                                | opens the ICP or the Solana hide modal, and `EthHideTokenModal` for every other network, which saves the token as an `Erc20`                                           |
| `getTokenIdentifier` (`src/frontend/src/lib/utils/identifier.utils.ts:7`), `pageToken` (`src/frontend/src/lib/derived/page-token.derived.ts`) | no identifier, so the token page resolves by symbol; `pageToken` does not search XRP tokens                                                                            |
| `normaliseTokenForSave` (`src/frontend/src/lib/utils/tokens.utils.ts:591`), `src/frontend/src/lib/components/tokens/EnableTokenToggle.svelte` | not saved (dropped with "No changes need to be saved"), and no switch in Manage tokens                                                                                 |
| `toBackendTokenId` in open PR #14121 (`src/frontend/src/lib/utils/token-id.utils.ts`, on its branch)                                          | matches the network, so any XRP-mainnet token becomes `XrpNativeMainnet`: the send guard's row would record an RLUSD payment as native XRP                             |

Solana had the balance problem and solved it: since #14028 one worker per network syncs SOL and every enabled SPL token, routing each mint's balance and history to its token id (`src/frontend/src/sol/components/core/SolLoaderWallets.svelte`, `src/frontend/src/sol/services/worker.sol-wallet.services.ts`). That is the shape trust lines need.

### 3.3 Token list, storage and backend

- **Import.** `AddTokenByNetwork.svelte` renders forms for ICP, Ethereum/EVM and Solana (`src/frontend/src/lib/components/manage/AddTokenByNetwork.svelte:161`) and the "not yet" message for XRP. The SPL review fetches the metadata, refuses a symbol already in the list (`src/frontend/src/sol/components/tokens/SolAddTokenReview.svelte:100`), shows the existing "Make sure you trust the token" warning, and saves with `saveCustomTokensWithKey` — a backend write, no transaction (`src/frontend/src/lib/components/manage/AddTokenReviewByNetwork.svelte:212`).
- **Manage tokens switches are batched.** `onToggle` collects the changed rows (`src/frontend/src/lib/components/manage/ManageTokens.svelte:154`) and Save writes them together with `set_many_custom_tokens`. A default token's backend record only overrides its env default.
- **Hiding** saves the token as disabled; the record stays (`src/frontend/src/sol/components/tokens/SolHideTokenModal.svelte:68`). **Delete token** (`remove_custom_token`) is offered for imported tokens only and handles ERC-20, ICRC and SPL (`src/frontend/src/lib/components/tokens/TokenModal.svelte:220`); `XrpTokenModal` passes no `isDeletable`.
- **Holdings are not discovered for fungible tokens.** Solana and ERC-20 load only enabled tokens. NFTs are: `LoaderCollections.svelte` finds them and saves them to the backend, enabled, on its own (`src/frontend/src/lib/components/loaders/LoaderCollections.svelte:73`).
- **No backend type can name an XRPL token.** `Token` (`src/shared/src/types/custom_token.rs:94`), `CustomTokenId` (`:130`) and `TokenId` (`src/shared/src/types/token_id.rs`, last variant `XrpNativeMainnet = 17`) have no such variant. A new `Token` variant fails `npm run check` at `parsePrincipal` (`src/frontend/src/lib/services/custom-tokens.services.ts:144`), a new `TokenId` variant at `tokenIdKey` (`src/frontend/src/lib/utils/token-id.utils.ts:77`) and `cargo` at `is_priceable_token_id` (`src/backend/src/exchange/providers/coingecko/platform.rs:37`). `CustomTokenId` exists only in Rust, not in the Candid interface.
- **The in-flight send guard is native-only.** `ActiveUserTransactionData::Xrp` (#14109, merged 2026-09-29) carries `amount` in drops (`src/shared/src/types/active_user_transaction.rs:306`), and `require_xrp_token` accepts only `TokenId::XrpNativeMainnet` (`src/backend/src/active_user_transactions/model.rs:455`). The frontend half, open PR #14121, creates the row between signing and submitting. The row's display snapshot (`amount`, `token_symbol`, `network_symbol`) already names a token, but its fallback formats with `XRP_TOKEN`, and its messages speak of "XRP payments".
- **Prices.** The CoinGecko platform enum has no XRPL entry (`src/frontend/src/lib/schema/coingecko.schema.ts:18`), and the XRP network defines no `exchange` field. SPL is priced through a dedicated call with the platform `solana` and the enabled token addresses (`src/frontend/src/lib/services/exchange.services.ts:247`). An unpriced token shows "-" and counts as 0 in totals.

## 4. Behaviour

### 4.1 Listed and imported tokens

- **RLUSD is a curated XRPL token** (asset type Stablecoins): it appears in Manage tokens, is not enabled by default, and carries its name and icon. It cannot be enabled by default: enabling it costs a transaction and a reserve.
- **Any other trust-line token** is added through Import token → XRP Ledger, by issuer address and currency code.
- **In Manage tokens, a trust-line token's switch does not join the batched Save.** Switching RLUSD on opens the review of §4.2 at once, and RLUSD counts as enabled only once its trust line exists.

### 4.2 Adding a token

**Form.** The issuer is a classic address; X-addresses are refused, as the XRP contacts draft (#14159) refuses them. The currency code is accepted in three spellings:

| Input                                      | Meaning                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| exactly 3 characters                       | a standard code; `XRP` is refused                                                             |
| 40 hex characters                          | a nonstandard code, stored uppercase as the ledger reports it; a leading `00` byte is refused |
| 4 to 20 printable ASCII characters (RLUSD) | encoded as the zero-padded 40-hex code, as RLUSD's code is                                    |

A symbol already in the list is not a refusal, unlike in the SPL review: two issuers' "RLUSD" is the expected case on XRPL. Only the same currency and issuer is — "already added".

**Checks before the review**, each with its own message:

- the issuer has no account on the ledger;
- the issuer refuses new trust lines (DisallowIncomingTrustline);
- the issuer is the user's own address;
- the user's own account is not on the ledger yet ("receive at least 1 XRP first");
- the account cannot pay the fee, or — once it already owns two objects — cannot keep the raised reserve (the ledger would fail the `TrustSet` and keep the fee);
- another XRP transaction from this address is still unresolved (the in-flight guard, §4.8).

**Review.** It shows:

- the symbol (the decoded code) and, as "Issued by", the full issuer address with an explorer link;
- every issuer power from §2.3 that applies to this issuer, in plain words ("The issuer can freeze your balance", "The issuer can take tokens back from your balance", "The issuer must approve your account before you can receive it", "Transfers between holders cost a 0.5 % fee", "Holders cannot send it to each other");
- the cost: the network fee, and that 0.2 XRP stays reserved until the token is removed, with the account's XRP reserve after adding — stated even when the waiver of §2.2 applies, because the reserve counts afterwards;
- a warning when the code matches a listed token's code under another issuer: "This is not the RLUSD that OISY lists. RLUSD is issued by rMxCK…m5De.";
- the existing "Make sure you trust the token" warning.

The issuer's self-declared `Domain` is never shown: any account can set any domain, including `ripple.com`.

**The transaction.** A `TrustSet` with the ledger's maximum limit (`9999999999999999e80`), so receiving is never capped; with `tfSetNoRipple`, so nothing ripples through the user's account and the line can be deleted later; no quality settings. It is signed, submitted and confirmed like an XRP payment.

**Afterwards.** Once the `TrustSet` validates, the token is saved to the user's token list in the backend and appears with a zero balance, or as "Waiting for the issuer's approval" for an issuer requiring approval. If it fails or expires nothing is saved, and the user can try again.

### 4.3 The token list

- **What the ledger holds is shown.** A trust line on the ledger without a backend entry — the backend write failed after the `TrustSet` validated, say — is saved to the backend list, enabled, the way `LoaderCollections` saves the NFTs it finds. A trust line never disappears from view without the user choosing to hide it.
- A backend entry without a trust line — a removal whose backend write failed — is treated as not added.
- The balance is the line's balance as the ledger reports it.
- **Hiding** — the token menu's Hide, or switching the token off in Manage tokens — saves it as disabled. Its trust line and its reserve stay (D3).
- A frozen, deep-frozen or not-yet-approved line says so on the token.
- **USD value:** by `simple/token_price/xrp` under the token's `<currency>.<issuer>` key — the 40-hex code for RLUSD, the 3-character code for a standard one — for RLUSD and imported tokens alike; otherwise no value, as for any unpriced token.

### 4.4 Receiving

The same XRP address, no destination tag needed. The receive screen says which issuer's token can arrive: "Only RLUSD issued by rMxCK…m5De can be received here."

### 4.5 Sending

- A token payment names the token by currency and issuer; the network fee is paid in XRP, so the XRP balance must cover it above the reserve.
- With a transfer fee, the recipient gets the amount entered and the sender pays the fee on top, shown at review in the token. Without one, no fee is added.
- Never a partial payment, never a path: the payment delivers the amount entered or fails.
- **Max** sends the whole balance when there is no transfer fee, leaving exactly zero, so the token can be removed afterwards. With a transfer fee, max is the largest amount whose fee still fits.
- An amount with more significant digits than the ledger holds is refused, never rounded.
- **Refused before signing** — each case one the ledger would otherwise fail while keeping the fee — each with its own message:
  - the recipient has no account on the ledger;
  - the recipient has no trust line for this token from this issuer, or its limit cannot take the amount, or its line is deep-frozen, or it is waiting for the issuer's approval (the issuer itself needs no trust line);
  - the recipient accepts payments only from accounts it preauthorized (DepositAuth) and has not preauthorized this one — the RLUSD issuer, for an ordinary holder;
  - the user's line is frozen, or the issuer froze every holder, and the recipient is not the issuer;
  - the user's line is deep-frozen;
  - the issuer blocks transfers between holders and the recipient is not the issuer;
  - the recipient requires a destination tag and none is given (the existing XRP rule).
- **XRP payments get the DepositAuth refusal too** (D6). Today they are signed and fail on the ledger (§3.1). OISY asks the ledger (`deposit_authorized`) only when the recipient's account has DepositAuth set, so a payment to any other account makes no extra call.
- When the recipient's or the issuer's state cannot be read, the send is refused, not signed unchecked — the same fail-closed answer as the XRP send's existing `xrp_account_state_unavailable` message. How the form shows loading and failure while it waits is open draft #14101's subject and applies to the token form unchanged.
- Destination tags and the first-time destination check work as they do for XRP, and a token send counts as a send to that address. XRP contacts and recently used addresses (open drafts #14159 and #14160) apply the same way once they land.
- The row under the header bell button "Active transactions" reads "Send 25 RLUSD".

### 4.6 History

- Token payments, sent and received, appear on the token's page and in Activity. XRP's page keeps showing native XRP only.
- The amount is what moved on the user's trust line, read from the transaction metadata (§2.6) — never the amount the payment asked for.
- A token's page shows that token's payments even when the account's newest transactions concern other assets: history keeps loading until the page is filled or the history ends.
- Not listed: the `TrustSet` that added or removed a token, and an issuer's clawback or freeze. The balance reflects them (D5).

### 4.7 Removing a token

- Removal is the token modal's **Delete token** action. Unlike on the other networks it is offered for RLUSD too, because only it releases the reserve.
- It is offered when the ledger balance is exactly zero. It signs a `TrustSet` with limit 0; the ledger deletes the line when the issuer's side is in its default state too, and 0.2 XRP becomes spendable again. Then the backend entry goes — deleted for an imported token, disabled for RLUSD, which returns to "not enabled" in Manage tokens.
- When the ledger keeps the line — the issuer froze it or holds settings on its side — OISY says so, and the token stays with its reserve.
- With a non-zero balance removal is not offered; the token can be hidden instead.

### 4.8 One unresolved transaction per XRP address

A `TrustSet` consumes the account's `Sequence` exactly as a payment does, so the in-flight guard of `2026-09-19-feat-xrp-in-flight-send-guard.md` covers every transaction OISY signs for an XRP address: an XRP payment, a token payment, adding and removing a token. While one is unresolved, the next is refused. Adding and removing a token show their own rows, "Add RLUSD" and "Remove RLUSD".

### 4.9 Negative guarantees

- OISY never creates or changes a trust line without the user confirming the review.
- It never lets anything ripple through the user's account.
- It never caps what the user can receive.
- It never shows an imported token's name or icon from an unverified source, and never shows an issuer's `Domain`.
- It never signs a token payment that the ledger would reject for a reason OISY can read beforehand (§4.5).
- It never sends a partial payment.
- It never adds a token on its own. A trust line OISY finds on the ledger (§4.3) is one the user confirmed.

## 5. Acceptance criteria

1. Import with an issuer address and a currency code in each of the three spellings of §4.2 resolves the same token; `XRP`, a leading `00` byte and an X-address are refused.
2. Import of an issuer without an account, or with DisallowIncomingTrustline, is refused before the review.
3. From an account that is not on the ledger, adding a token is refused with the "receive at least 1 XRP first" message.
4. The review lists every issuer power of §2.3 that applies; for RLUSD exactly freeze and clawback.
5. The review states the network fee and the 0.2 XRP reserve, including for the first two tokens, whose reserve the ledger waives at creation.
6. A token whose code matches RLUSD's under another issuer shows the "not the RLUSD that OISY lists" warning, and is not refused for its symbol.
7. After a confirmed add, the ledger holds a trust line with NoRipple set on the user's side and the maximum limit, and the token appears with a zero balance.
8. Switching RLUSD on in Manage tokens opens the review instead of joining the batched Save.
9. A trust line on the ledger without a backend entry is saved to the backend and shown.
10. Each trust-line token's balance equals its line's on the ledger, and XRP's balance and history stay XRP's; sending max of a fee-free token leaves exactly zero.
11. An amount with more precision than the ledger holds is refused, not rounded.
12. Each refusal of §4.5 happens before signing, with its own message.
13. With a transfer fee, the recipient receives the amount entered and the review shows the fee.
14. A received payment shows what moved on the user's line, including a partial payment.
15. A token's page shows its payments when the account's newest 10 transactions are about other assets.
16. With any XRP transaction unresolved for an address — XRP payment, token payment, add or remove — the next one from that address is refused, and each row names what it is.
17. Removing a token at zero balance deletes the line and raises the spendable XRP by 0.2 XRP; removal is not offered at a non-zero balance.
18. No screen shows an issuer's `Domain`.
19. RLUSD shows a USD value; an imported token that CoinGecko does not list shows none.
20. An XRP payment to an account with DepositAuth that has not preauthorized the sender is refused before signing; a payment to an account without DepositAuth makes no `deposit_authorized` call.
21. With the flag off, nothing of this spec is reachable or runs: no RLUSD entry, no XRP import form, no `account_lines` or `deposit_authorized` call, and XRP payments behave as on `main`.

## 6. Non-goals

- **Multi-Purpose Tokens (MPTs).** Enabled on mainnet (`MPTokensV1`, checked 2026-09-29), but a second token model: an issuance id instead of a currency and issuer, integer amounts with a scale, and an `MPTokenAuthorize` opt-in. A later spec.
- Cross-currency payments, paths, DEX offers, and AMM deposits or LP tokens.
- Anything an issuer does: issuing, approving holders, freezing, clawing back, setting a transfer fee.
- Verifying issuer domains (`xrp-ledger.toml`) and token names or logos from third-party services.
- WalletConnect XRPL methods and swaps of XRPL tokens (the NEAR Intents XRP spec, #14161, covers native XRP only).
- XRPL testnet.

## 7. Implementation plan

### 7.1 Backend

- A trust-line variant in `Token`, `CustomTokenId` and `TokenId`, each carrying the currency code and the issuer: `Token::XrpTrustLineMainnet(XrpTrustLineToken { currency, issuer })`, `CustomTokenId::XrpTrustLineMainnet(currency, issuer)` and `TokenId::XrpTrustLineMainnet(currency, issuer)`. `XrpCurrencyCode` holds the rules of §2.1, with hex kept uppercase so that a token has one spelling; the issuer is #14159's `XrpAddress`, parsed in full (base58check, version byte, checksum). Both are checked when a custom token is written and when it is decoded.
- `is_priceable_token_id` and the backend-mode CoinGecko mapping (`src/backend/src/exchange/providers/coingecko/platform.rs`) gain the `xrp` platform.
- The in-flight guard: `require_xrp_token` accepts the new `TokenId`; `XrpData.amount` is documented as drops for XRP and as the token's fixed-point units (§7.3) for a token; adding and removing a token get their own variant, `XrpTrustSet(XrpTrustSetData { token, source_address, change, fee })` with `change` one of `Add` and `Remove`, which has no amount and no destination and refuses a trust line to the account's own address; the one-unresolved-per-address check counts both variants.
- `Token`, `TokenId` and the new `ActiveUserTransactionData` variant are breaking Candid changes, so the PR is `feat(backend,frontend)!:` with a `BREAKING CHANGE:` note (`docs/ai/backend/workflows/breaking-interface.md`). It carries the frontend arms `npm run check` then requires — `parsePrincipal` and `tokenIdKey` — and no UI. After it merges, the staging backend needs a forced deploy, as #14109 did.
- The backend wasm does not build locally: the `.did` is hand-written in field-hash order and CI's `binding-checks` regenerates the declarations.

### 7.2 RPC

- `account_lines`: the account's lines for balances (paginated with `marker`), and the recipient's line for the send checks (with `peer` = issuer). `deposit_authorized`: whether a DepositAuth recipient accepts this sender. `account_info` on the issuer, for its flags and `TransferRate`, is already whitelisted.
- Both methods go on the QuickNode method whitelist before any build that calls them reaches a deployed environment, and into the method table of `docs/ai/integrations/xrpl.md`.

### 7.3 Frontend

- **Token model.** An XRPL trust-line token type with its own standard; RLUSD in `src/frontend/src/env/tokens/tokens.xrp.env.ts`, its icon under `src/frontend/src/xrp/assets/` (per `docs/ai/frontend/workflows/new-token-or-network.md`). `getTokenIdentifier` returns currency and issuer together, and the token's frontend `TokenId` is created from that pair rather than from the ticker: the saved Activity filter (`transactionsFilterTokenKey`, `src/frontend/src/lib/utils/transactions-filter.utils.ts:13`) and the IndexedDB transaction cache (`toKey`, `src/frontend/src/lib/api/idb-transactions.api.ts:33`) both key on `TokenId.description`, and on XRPL two issuers' "RLUSD" is the expected case, not a corner. The standard is wired into every place of §3.2, and into the hand-maintained lists that no compile check covers: `normaliseTokenForSave`, `hideTokenByKey` and `reloadAllCustomTokens` (`save-custom-tokens.services.ts`), `mapTokenManageNetwork` and `SaveTokensToken` (`manage-tokens.services.ts`), and `parseCustomTokenId`, which today types only ETH and SOL chain ids (`custom-token.utils.ts`).
- **Amounts.** A fixed scale of 18 decimals: exact for every ledger amount of at least 0.001, and within the 256-bit bound of `XrpData.amount` for up to 10^59 tokens. Removal and max read the ledger's balance string, never the scaled value, so dust below the scale cannot block a removal or survive a max send.
- **Balances.** The native XRP token's wallet worker is already the one worker per address, so it reads `account_lines` beside `account_info` — once per tick, an outage leaving the lines as they were — and posts the lines when they change. The main thread maps each line to its token by currency and issuer and writes that token's balance; a line that disappears resets its token's balance. Trust-line tokens never get a worker of their own, which is what would make each of them poll the account's XRP (§3.2). Solana's #14028 routes inside the worker instead; here the worker stays token-agnostic, so the set of tokens can change without restarting it. Lines without a backend entry are saved to it in PR 3, with the rest of the saving.
- **Adding and removing.** An XRP branch in `AddTokenByNetwork.svelte` with the form of §4.2, replacing the "not yet" message; a review component; and one service that builds, signs, submits and confirms a `TrustSet` through the same guard, signer and confirmation loop as `sendXrp` (`signXrpTransaction` takes any transaction rather than only `XrpPayment`). The RLUSD switch in Manage tokens opens that review. An XRP branch in `TokenMenu.svelte`'s hide routing. `XrpTokenModal` passes `isDeletable`, and `TokenModal`'s delete gains an XRP branch that sends the `TrustSet` before touching the backend entry and its IndexedDB copy.
- **Send.** `XrpSendTokenWizard` branches on the token: amount and max in the token, fee and reserve in XRP. `sendXrp` gains token amounts and `SendMax`. `toBackendTokenId` gains a trust-line branch **before** #14121's XRP-mainnet network match. The checks of §4.5 run on `account_lines` for the recipient (`peer` = issuer), `account_info` for the recipient and the issuer, and `deposit_authorized` — for XRP payments too, and only when the recipient's account has DepositAuth set.
- **History.** `mapXrpTransaction` gains a token branch reading the metadata; the rows land in `xrpTransactionsStore` under the token's id (the store is keyed by `TokenId` already); `pageToken` searches XRP tokens; the loader fetches further `account_tx` pages until a token's page is filled or history ends.
- **The guard's rows.** The display snapshot carries the token; the fallback formats by the row's `TokenId` instead of `XRP_TOKEN`; the messages speak of the XRP account's earlier transaction rather than of an XRP payment; adding and removing render as "Add RLUSD" and "Remove RLUSD".
- **Prices.** `xrp` joins `CoingeckoPlatformIdSchema`, and every held trust-line token, RLUSD included, is priced through a dedicated call in the shape of SPL's under its `<currency>.<issuer>` key (§4.3): CoinGecko prices RLUSD under that key too (§2.7), so no coin id is needed. The backend's price mode maps the `XrpTrustLineMainnet` `TokenId` to the same key, and the providers fill keys the backend left unpriced, as they do for SPL. Its own PR (2b): the exchange worker's provider, backend and fallback paths each list every price they return, so pricing touches all of them and their tests, and nothing is priced before a token can be held.
- **Rollout.** A feature flag, `XRP_TRUST_LINE_TOKENS_ENABLED = (LOCAL || STAGING) && !TEST`, in its own env file (`src/frontend/src/env/xrp-trust-line-tokens.env.ts`) like `src/frontend/src/env/cycles-mint.env.ts`. Off under unit tests too, so suite-wide token and balance expectations stay as they are until the flag is turned on; the feature's own tests switch it on. Until PR 4 a trust-line token is also kept out of every send path — the Send button on its page, the send modal's token list, and the XRP send wizard, which would otherwise move XRP for it. With it off, nothing of this spec runs: no RLUSD entry, no XRP import form, no `account_lines` or `deposit_authorized` call, and XRP payments behave as on `main`. Each PR of §7.4 merges with the flag off on production and beta and is tested on staging; the last PR sets it to `true as boolean`, as #14136 did for `CYCLES_MINT_ENABLED`.
- **Analytics.** A token send emits the existing `xrp_send_success` / `xrp_send_error` (`src/frontend/src/lib/constants/analytics.constants.ts:57`), whose `token` metadata already carries the symbol; adding and removing a token get their own success and error events, documented in `docs/ai/frontend/analytics.md`.
- **`PRODUCT.md`.** The XRP Ledger section gains a Tokens part, including the negative guarantees of §4.9, in the PR that turns the flag on: that is when users first see any of it.
- **i18n.** Every new string in the locales of the `Languages` enum.

### 7.4 PRs

Every PR after the first merges behind the flag of §7.3 and is tested on staging; only the last one turns the feature on.

| #   | PR                                                  | Scope                                                                                                                        |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | this spec + `feat(backend,frontend)!:` variants     | §7.1, and the frontend arms the new variants force; no UI, so nothing to put behind the flag                                 |
| 2   | `feat(frontend)`: trust-line balances               | the flag, token model, RLUSD entry, `account_lines`, balances through the native XRP worker, the send guard                  |
| 2b  | `feat(frontend)`: trust-line prices                 | CoinGecko's `xrp` platform by `<currency>.<issuer>`, RLUSD included, through the exchange worker                             |
| 3   | `feat(frontend)`: add a trust-line token            | import form, review, `TrustSet` through the guard, saving tokens and lines without a backend entry, the RLUSD switch, hiding |
| 4   | `feat(frontend)`: send a trust-line token           | token payments, `SendMax`, the checks of §4.5, max, and the DepositAuth check for token and XRP payments                     |
| 5   | `feat(frontend)`: trust-line token history          | metadata mapping, per-token history, pagination                                                                              |
| 6   | `feat(frontend)`: remove a trust-line token, enable | removal, reserve release, the flag set to `true as boolean`, `PRODUCT.md` complete                                           |

Each PR ships its tests (the coverage gate ratchets). End-to-end testing on staging becomes possible with PR 3, since before it no account can hold a trust line. The guard's changes in PRs 3 and 4 need #14121 on `main`.

## 8. Open questions (facts to confirm)

- **Does the QuickNode Clio endpoint answer `account_lines` (with `peer`) and `deposit_authorized` once whitelisted?** Public Clio does (checked 2026-09-29). The whitelist edit comes first.
- **Where does the RLUSD icon come from, and under what licence?**

## 9. Pending decisions (facts are clear)

None.

## 10. Resolved

- **D1 Scope:** trust-line tokens only: RLUSD listed, plus import of any trust-line token by issuer and currency. MPTs get a later spec (2026-09-29).
- **D2 Listed tokens:** RLUSD only (2026-09-29). Every further entry is a curation decision OISY then maintains.
- **D3 Switching a token off hides it (§4.3):** the trust line and its 0.2 XRP reserve stay, and the token can still arrive, as a hidden token can on any other network. Removal (§4.7) is its own action, the token modal's Delete token, offered only at zero balance (2026-09-29). Removing on switch-off would fail at any non-zero balance and turn a display switch into a transaction.
- **D4 Restrictive issuers (§4.2):** a token whose issuer requires approval, or blocks transfers between holders, can be imported, with the restriction stated at review and on the token (2026-09-29).
- **D5 History (§4.6):** `TrustSet`, clawback and freeze transactions are not listed in this spec; the balance reflects them (2026-09-29).
- **D6 DepositAuth for XRP payments (§4.5):** the check covers XRP payments too, behind the same flag (2026-09-29). It sits in the same `sendXrp` path, and today such a payment is signed and fails on the ledger, keeping its fee (§3.1).
- **D7 Rollout (§7.3, §7.4):** a feature flag, on locally and on staging, gates everything while the PRs land and are tested on staging; the last PR turns it on in every environment, as #14136 did for `CYCLES_MINT_ENABLED` (2026-09-29).
- **D8 The guard extension rides in PR 1:** now that #14109 has merged, the new `TokenId` variant is a breaking change anyway, so extending the guard adds no second breaking PR (2026-09-29).
