This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Personal note on a transaction

## Goal

Let a user attach an **optional, free-text personal note** to **any** of their
transactions — sent **or** received. The note is:

1. **Addable from the transaction details modal** for **any** transaction (the
   primary, direction-agnostic path) — add, edit, or delete.
2. **Also enterable at send time** — an optional input in the shared send form,
   before the user confirms, as a convenience for the send flow. (Sends only, by
   nature: there is no user-initiated moment to pre-write a note for an incoming
   transaction — those are noted from the details modal after they arrive.)
3. **Stored per-user in the backend canister**, keyed to the specific
   transaction (so it survives reloads and follows the user across devices).

All entry points go through the same upsert (`set_transaction_personal_note`),
so the note belongs to the **transaction**, not to the act of sending —
consistent with the name `TransactionPersonalNote`. There is no "send-time-only"
note.

Scope is **all networks** (BTC, ETH/EVM, SOL, ICP/ICRC) and **both transaction
directions** (sent and received). The note is the user's own private annotation —
it is never put on-chain and has no effect on the transaction itself.

## Motivation

Users send to the same addresses for different reasons ("rent", "refund to
Alice", "DCA buy") and today have no way to record why. The on-chain ICRC `memo`
([`IcrcTransactionData.memo`](../../../../src/backend/backend.did)) is not user free
text and does not exist on other networks. Contact-address **labels**
(`ContactAddressData.label`) annotate an _address_, not a _transaction_. A
per-transaction note fills the gap with a private, editable annotation that works
uniformly across every network OISY supports.

---

## Background (today's code)

### Frontend send flow

- **Orchestrator:** [`src/frontend/src/lib/components/send/SendModal.svelte`](../../../../src/frontend/src/lib/components/send/SendModal.svelte)
  is the `WizardModal` host. It holds the shared wizard state as `$state`
  (`destination`, `amount`, `selectedContact`, `sendProgressStep`). Steps come
  from [`src/frontend/src/lib/config/send.config.ts`](../../../../src/frontend/src/lib/config/send.config.ts);
  the step enum is `WizardStepsSend { DESTINATION, SEND, REVIEW, SENDING, … }` in
  [`src/frontend/src/lib/enums/wizard-steps.ts`](../../../../src/frontend/src/lib/enums/wizard-steps.ts).
- **Network dispatcher:** [`src/frontend/src/lib/components/send/SendWizard.svelte`](../../../../src/frontend/src/lib/components/send/SendWizard.svelte)
  renders one of `EthSendTokenWizard`, `IcSendTokenWizard`, `BtcSendTokenWizard`,
  `SolSendTokenWizard` based on the selected network.
- **Shared form:** [`src/frontend/src/lib/components/send/SendForm.svelte`](../../../../src/frontend/src/lib/components/send/SendForm.svelte)
  is the common form (destination, `selectedContact`, and per-network `sendAmount`
  / `fee` / `info` snippets). Per-network wrappers feed it, e.g.
  [`src/frontend/src/icp/components/send/IcSendForm.svelte`](../../../../src/frontend/src/icp/components/send/IcSendForm.svelte)
  and the `eth` / `btc` / `sol` siblings. **This is the natural home for the note
  input.**
- **Review step:** [`src/frontend/src/lib/components/send/SendReview.svelte`](../../../../src/frontend/src/lib/components/send/SendReview.svelte)
  (+ per-network `*SendReview.svelte`) renders the confirm screen and the final
  Send button (`REVIEW_FORM_SEND_BUTTON`).
- **Send dispatch & resulting id:** each per-network `*SendTokenWizard.svelte`
  owns the `send()` call:
  - ICP/ICRC → `sendIc(...)` in [`src/frontend/src/icp/services/ic-send.services.ts`](../../../../src/frontend/src/icp/services/ic-send.services.ts)
    (block index).
  - ETH/EVM → `send` in [`src/frontend/src/eth/services/send.services.ts`](../../../../src/frontend/src/eth/services/send.services.ts)
    (tx hash).
  - BTC → `sendBtc(...)` in [`src/frontend/src/btc/services/btc-send.services.ts`](../../../../src/frontend/src/btc/services/btc-send.services.ts)
    (txid).
  - SOL → [`src/frontend/src/sol/services/sol-send.services.ts`](../../../../src/frontend/src/sol/services/sol-send.services.ts)
    (signature).

### Frontend transaction details

Four per-network modals render detail rows with the shared `List` / `ListItem`
primitives ([`src/frontend/src/lib/components/common/List.svelte`](../../../../src/frontend/src/lib/components/common/List.svelte),
`ListItem.svelte`):

- [`src/frontend/src/icp/components/transactions/IcTransactionModal.svelte`](../../../../src/frontend/src/icp/components/transactions/IcTransactionModal.svelte)
- [`src/frontend/src/sol/components/transactions/SolTransactionModal.svelte`](../../../../src/frontend/src/sol/components/transactions/SolTransactionModal.svelte)
- [`src/frontend/src/eth/components/transactions/EthTransactionModal.svelte`](../../../../src/frontend/src/eth/components/transactions/EthTransactionModal.svelte)
- [`src/frontend/src/btc/components/transactions/BtcTransactionModal.svelte`](../../../../src/frontend/src/btc/components/transactions/BtcTransactionModal.svelte)

The transaction UI union is `AnyTransactionUi` in
[`src/frontend/src/lib/types/transaction-ui.ts`](../../../../src/frontend/src/lib/types/transaction-ui.ts);
each variant carries the network's id/hash.

### The existing per-user "user-authored metadata" pattern — Contacts

Contacts are the cleanest template for reading/writing per-principal user data:

- Shared types: [`src/shared/src/types/contact.rs`](../../../../src/shared/src/types/contact.rs)
  (`Contact`, `StoredContacts`, `CreateContactRequest`, `ContactError`,
  `MAX_CONTACTS_PER_USER`).
- Result enums: [`src/shared/src/types/result_types.rs`](../../../../src/shared/src/types/result_types.rs)
  (`CreateContactResult` … with `From<Result<…, ContactError>>` impls).
- Stable map: `ContactMap = StableBTreeMap<StoredPrincipal, Candid<StoredContacts>>`
  ([`src/backend/src/types/maps.rs`](../../../../src/backend/src/types/maps.rs)),
  MemoryId 6, `State.contact` field.
- API handlers: [`src/backend/src/api/contacts.rs`](../../../../src/backend/src/api/contacts.rs)
  (`create_contact`/`update_contact`/`delete_contact` are
  `#[update(guard = "caller_is_registered_user")]`; `get_contacts` is
  `#[query(guard = "caller_is_not_anonymous")]`).
- Service: [`src/backend/src/contacts/service.rs`](../../../../src/backend/src/contacts/service.rs).
- Frontend: API wrappers in [`src/frontend/src/lib/api/backend.api.ts`](../../../../src/frontend/src/lib/api/backend.api.ts),
  service [`src/frontend/src/lib/services/manage-contacts.service.ts`](../../../../src/frontend/src/lib/services/manage-contacts.service.ts),
  store [`src/frontend/src/lib/stores/contacts.store.ts`](../../../../src/frontend/src/lib/stores/contacts.store.ts),
  input UI [`src/frontend/src/lib/components/address-book/InputContactName.svelte`](../../../../src/frontend/src/lib/components/address-book/InputContactName.svelte)
  (wraps `InputText`, enforces `CONTACT_MAX_NAME_LENGTH`).

### The existing per-transaction backend store — `UserTransaction`

There is already a backend transaction store, but it is **SOL-only and
finalized-tx-only**, so it is _not_ a fit for a cross-network, send-time note:

- Shared type `UserTransaction { id, to, block_index, value, from, network_data,
timestamp }` in [`src/shared/src/types/user_transaction.rs`](../../../../src/shared/src/types/user_transaction.rs).
  `id: String` is documented as the **network-unique identifier** (EVM tx hash,
  BTC txid, SOL signature, stringified ICRC block index). It has **no note
  field**.
- Map `UserTransactionsMap` keyed by composite `(StoredPrincipal, TokenId)` →
  `Candid<Vec<UserTransaction>>` ([`src/backend/src/types/maps.rs`](../../../../src/backend/src/types/maps.rs)).
- Endpoints `save_user_transactions` / `get_user_transactions` in
  [`src/backend/src/api/transactions.rs`](../../../../src/backend/src/api/transactions.rs).
- Only `src/frontend/src/sol/...` writes/reads it today.

The important reuse here is the **`id` semantics** (the cross-network
transaction identifier) and the **composite-key encoding pattern**, not the
`UserTransaction` value type itself.

### Backend storage conventions

From [`docs/ai/backend/structure.md`](../../../../docs/ai/backend/structure.md) /
[`patterns.md`](../../../../docs/ai/backend/patterns.md):

- All persisted state lives in the single `STATE` cell in
  [`src/backend/src/state/mod.rs`](../../../../src/backend/src/state/mod.rs);
  read via `read_state`, write via `mutate_state`, never hold a borrow across
  `.await`.
- Collections are `ic-stable-structures` keyed by a `MemoryId` from
  [`src/backend/src/state/memory.rs`](../../../../src/backend/src/state/memory.rs).
  **Next free `MemoryId` is `14`** (0–13 used; `5` is reserved/dead and must not
  be reused).
- Custom values become `Storable` via the `Candid<T>` wrapper
  ([`src/backend/src/types/storable.rs`](../../../../src/backend/src/types/storable.rs)).
- Composite keys are length-prefixed (`[u32 BE principal_len][principal][id]`),
  enabling a per-principal range scan — see `UserTransactionKey` /
  `ActiveUserTransactionKey` in
  [`src/backend/src/types/storable.rs`](../../../../src/backend/src/types/storable.rs).
- Candid-exposed types live in `src/shared/src/types/<area>.rs`; result enums in
  `shared::types::result_types`. After changing the API set, run
  `npm run generate` to regenerate `backend.did` (never hand-edit it).

---

## Decisions (resolved during clarification)

1. **All networks and both directions in v1** — BTC, ETH/EVM, SOL, ICP/ICRC,
   sent and received. One uniform note model across all of them, keyed by the
   transaction identifier (which is network-scoped via `TokenId`, Decision 7) —
   so it applies everywhere while still knowing each note's network.
2. **Full CRUD; the details modal is the universal entry point** — for **any**
   transaction (sent or received, including ones from before this feature
   shipped) the user can add / edit / delete a note from the transaction details
   modal. The send form is an **additional** send-time shortcut, not the only
   way in. "Add" and "edit" are the same `set_transaction_personal_note` upsert.
   Backend exposes set / get / delete.
3. **Length:** up to **500 characters** of cleartext, entered in a multi-line
   textarea. (Because the backend only ever sees ciphertext, this cap is enforced
   **client-side**; the backend enforces only a max **ciphertext byte** bound as
   defense-in-depth — see Decision 5.)
4. **Notes go into ONE NEW, dedicated store shared across all networks — no
   existing store is reused.** A single new per-user store holds notes for **all
   networks** (BTC, ETH/EVM, SOL, ICP/ICRC), sent and received — one shared store,
   not one per network, and **not** an extension of `UserTransaction` (SOL-only,
   finalized-only, capped/evicting — see Out of Scope 5), contacts, or any other
   existing collection. **Each note records exactly which network and token it
   belongs to:** the entry key is `(TokenId, tx_id)`, and `TokenId` encodes the
   network (Decision 7), so a Solana note and an Ethereum note are unambiguously
   distinct even with identical `tx_id`. Concretely the store is a per-user
   encrypted key-value map (vetKeys `EncryptedMaps`, Decision 5). Rationale: a
   note can be created for any transaction on any network, from the send flow or
   the details modal, so it must not depend on any network-specific or
   finalized-tx persistence path.
5. **Encryption is settled: client-side via vetKeys.** The note is encrypted in
   the browser before it leaves the device and decrypted in the browser on read;
   the canister and subnet nodes only ever see **ciphertext**. A **per-user**
   symmetric key is derived via vetKD (one key per principal, encrypting all that
   user's notes — no per-note key, since we do not need note sharing). This is a
   deliberately stronger bar than how contacts are stored today, because a
   free-text note is more revealing than a contact name.
6. **New dependencies approved by the PM** (per CLAUDE.md): `ic-vetkeys` (Cargo,
   backend) and `@dfinity/vetkeys` (npm, frontend).
7. **`TokenId` is network-scoped by construction** (verified in
   [`src/shared/src/types/token_id.rs`](../../../../src/shared/src/types/token_id.rs)):
   EVM variants carry a `ChainId`, ICRC carries the `LedgerId`, SOL/SPL/BTC split
   into explicit mainnet/devnet/testnet variants, IC NFTs carry the `CanisterId`.
   So keying on `TokenId` already encodes the network — the same tx hash on two
   EVM chains cannot collide.
8. **Delete is idempotent** — `delete_transaction_personal_note` on a missing
   note returns `Ok`, not an error. Cleaner UI, simpler clients, no `NotFound`
   case to handle.
9. **`get` loads notes per network**, not all-at-once and not per-token.
   `get_transaction_personal_notes` takes a `NetworkSettingsFor` and returns just
   that network's notes for the caller. This matches OISY's network-organized UX
   and the existing per-user-per-network keying (`NetworkSettingsFor` already keys
   network settings); it is coarser than the per-token, paginated
   `get_user_transactions` on purpose, because notes are sparse (Decision 10 caps
   them) so one fetch per network is cheap and needs no pagination. The frontend
   loads notes only for the user's **enabled** networks, lazily as they navigate
   into each — matching how tokens/balances/transactions are already gated. (To make
   this a backend range scan rather than client-side filtering, the entry key is
   network-prefixed — see Key model — which depends on `EncryptedMaps` supporting
   prefix scans; see [Open questions](#open-questions-facts-to-confirm).)
10. **The notes store is capped at `MAX_TRANSACTION_PERSONAL_NOTES_PER_USER =
10,000` per user and rejects at capacity — it never evicts.** This is the
    deliberate opposite of `UserTransaction` (Out of Scope 5): a note is
    intentional user data, so at the cap a new note is refused with a clear error
    (`TooManyNotes`) rather than silently dropping an older one. Mirrors the
    contacts cap pattern (`MAX_CONTACTS_PER_USER`) and aligns with
    `MAX_USER_TRANSACTIONS_PER_TOKEN`. Worst-case storage at the cap is
    ~8 MB/user (ASCII) to ~18 MB/user (CJK-dense), ~20 MB with headroom.
11. **The frontend disables new-note creation when the cap is reached**, at
    **both** entry points — the send form and the transaction-details "add" path —
    with a clear explanation of why (not a silent failure). **Editing and
    deleting existing notes stay enabled** (deleting frees capacity). Because
    notes load per network but the cap is per-user, this gate is driven by a cheap
    backend **count query** (`get_transaction_personal_notes_count`, below), not
    by the per-network loaded set. The backend `TooManyNotes` rejection
    (Decision 10) remains the source of truth; the client gate is UX only.
12. **Guards + rate limiting on the write endpoints.** Guards follow the
    established pattern (no new mechanism): `set`/`delete` are
    `#[update(guard = "caller_is_registered_user")]` (authenticated, II-backed,
    registered OISY user) and the `get`/`count` queries are
    `#[query(guard = "caller_is_not_anonymous")]` — same as `contacts` /
    `transactions` ([`src/backend/src/utils/guards.rs`](../../../../src/backend/src/utils/guards.rs)).
    On top of the guard, the writes are **per-caller rate-limited** via OISY's
    existing `RateLimiter` ([`src/backend/src/utils/rate_limiter.rs`](../../../../src/backend/src/utils/rate_limiter.rs);
    already used by `btc_add_pending_transaction` at 10/min, `allow_signing` at
    3/hr, the onramper signer at 30/min). Suggested **30 calls/min per caller**
    for `set` — generous because `set` covers both add and edit, so it must not
    impede a user tweaking a note, while still bounding abuse — and the same for
    `delete`. The `get`/`count` queries are pure stable-memory reads and stay
    unlimited (consistent with `contacts`/`transactions` reads).

---

## Design

Two HTML wireframes accompany this spec, one per entry point:

- [Send-form note](./2026-06-16-feat-transaction-personal-note/wireframes/send-form.html)
  — the optional note line item in the shared send form.
- [Transaction-details note](./2026-06-16-feat-transaction-personal-note/wireframes/transaction-details.html)
  — the add / edit / delete row in the transaction details modal.

### Identifier & timing (the crux)

Notes added **from the details modal** (the universal path, for sent or received
transactions) write and read with the **same** id the modal already holds — so
there is no parity risk there.

The parity risk is **specific to the send-form path**, because a transaction's
id/hash **only exists after the send is submitted**:

- The note text is captured in the **send form** (held in `SendModal` state).
- It is **persisted after `send()` returns** the network identifier, inside each
  `*SendTokenWizard.svelte`, keyed by that identifier + the token/network.
- Later, the details modal **reads the note back by its own identifier** for that
  transaction.

For that round-trip to work, the identifier written at send time **must be
byte-identical** to the identifier the details view uses (e.g. EVM hash
casing/`0x` prefix, ICRC block index stringification, BTC txid endianness, SOL
signature encoding). A single shared normalization helper is used for both the
write and the read key so they cannot drift. (See
[Open questions](#open-questions-facts-to-confirm) — this id-parity must be
verified per network.)

### Key model

With `EncryptedMaps`, each user has their own map; entries within it are keyed by
a **network-prefixed** byte key so a single network's notes can be range-scanned:

```
owner   = StoredPrincipal                       // the caller — selects the user's map
mapKey  = [ NetworkSettingsFor | TokenId | tx_id ]  // network leads, as stable bytes
value   = encrypted(note)                       // ciphertext; canister never sees cleartext
```

- `StoredPrincipal` — the caller; `EncryptedMaps` scopes entries per owner, so
  one user cannot read or write another's notes.
- `NetworkSettingsFor` — the leading key component
  ([`src/shared/src/types/network.rs`](../../../../src/shared/src/types/network.rs)),
  so `get` for one network is a prefix range scan. Derive it from the `TokenId`
  via a small helper (`TokenId → NetworkSettingsFor`).
- `TokenId` — the existing enum
  ([`src/shared/src/types/token_id.rs`](../../../../src/shared/src/types/token_id.rs)),
  **network-scoped by construction** (Decision 7): it disambiguates the same hash
  across chains and matches how transactions are already partitioned. Derive it
  via the existing `impl From<&Token> for TokenId`. (Including both `NetworkSettingsFor`
  and `TokenId` is mildly redundant since `TokenId` already implies the network,
  but the explicit network prefix is what makes the range scan clean.)
- `tx_id` — equals `UserTransaction.id` semantics (the cross-network identifier).

Encode the key to stable bytes via a small shared helper, with the
`NetworkSettingsFor` discriminator first so all of a network's entries share a
common prefix. Whether a per-network **range scan** is possible (vs. fetching the
whole map and filtering) depends on the `EncryptedMaps` query surface — see
[Open questions](#open-questions-facts-to-confirm), which also covers the
metadata-visibility of these (unencrypted) keys.

### Stored value

The value persisted by `EncryptedMaps` is the **ciphertext** of the note — the
canister never holds cleartext, so it cannot store or trust server-side
timestamps over the note content. The cleartext envelope encrypted on the client
is:

```
// cleartext, encrypted in the browser before storage:
{ note: String, created_at_ns: u64, updated_at_ns: u64 }
```

- `MAX_TRANSACTION_PERSONAL_NOTE_LENGTH = 500` — cleartext characters, enforced
  **client-side** (the backend sees only ciphertext). The backend additionally
  rejects any value above a fixed **max ciphertext byte** bound as
  defense-in-depth.
- Timestamps live inside the encrypted envelope (the client sets them); if a
  server-attested time is wanted instead, that is an [open question](#open-questions-facts-to-confirm).

### UI copy (i18n)

Final user-facing wording (keys live under `send.*` / `transaction.text.*` per the
PRs; the cap, privacy, and undo strings are shared between the send form and the
details modal):

- **Field / row label** (the line-item label in both the details row and the
  send form): "Personal note"
- **Add / edit affordance (same on both surfaces):** a `Personal note` line item
  with the label on the left and, on the right, a **`+ Add` button** (`IconPlus`)
  when no note exists yet, or an **edit pencil** (`IconPencil`) once a note is
  present. Identical in the send form and the details view.
- **Editor controls:** **Details** = `Cancel` / `Save`, with **`Delete`** (trash)
  inside the form. **Send form** = `Cancel` / `OK`, with **`Clear`** (eraser)
  inside the form. `Clear` empties the field but **stays in edit mode** (`Cancel`
  exits without changes); `Save`/`OK` confirm.
- **Placeholder:** a content **hint**, e.g. "e.g. Rent, refund to Alice" — kept
  distinct from the "Personal note" label and the "Add a personal note" affordance
  (the placeholder suggests _what to write_, it is not a second action label, and
  it does not repeat "private"; privacy lives in the helper text below).
- **Helper text** (under the field, both surfaces): "Private — only you can see
  this. The other party can't, and it's stored only in OISY."
- **Too-long error:** "Note must be {$maxCharacters} characters or fewer."
  (`$maxCharacters` placeholder, like the contact-name error.)
- **Cap reached** (shared, both entry points): "You've reached the maximum of
  {$max} saved notes. Delete one to add a new note."
- **After delete (undo):** "Note deleted" + an "Undo" action.
- **Decryption failure:** "Couldn't decrypt this note" + a "Retry" action.
- **Buttons:** reuse existing core "Cancel" / "Save" / "OK" labels where they
  exist; "Clear" and "Delete" are new strings.

Privacy framing follows Decision 5: convey that the note is private to the user,
**not visible to the counterparty**, and **stored only in OISY**, without
over-claiming encryption specifics in the short placeholder.

### Responsive (mobile)

On mobile, the note **entry/edit field opens as a bottom sheet** rather than
expanding inline, reusing the existing
[`src/frontend/src/lib/components/ui/BottomSheet.svelte`](../../../../src/frontend/src/lib/components/ui/BottomSheet.svelte)
(/ `CollapsibleBottomSheet.svelte`) — the same pattern OISY already uses for the
transactions filter and the token list on mobile. The sheet holds the
`InputTransactionPersonalNote` textarea + helper + Save/Cancel; on desktop the
field stays inline (the collapsed toggle in the send form, the inline editing row
in details). The viewing states (present / loading / decrypt-failure) render
in-place on both; only the editing affordance switches to a sheet on mobile.

---

## Implementation

Delivered as **atomic PRs across waves** — see
[Delivery plan](#delivery-plan-atomic-prs--waves). Each PR is independently
mergeable with its own tests.

### PR-1 (backend) — Encrypted storage (vetKeys `EncryptedMaps`) + API

**Dependency (approved, Decision 6):** add `ic-vetkeys` to the backend
`Cargo.toml` and use its `EncryptedMaps` (which wraps the `vetkd` system API).

**Shared / candid types** — new module
`src/shared/src/types/transaction_personal_note.rs`. Note the value crossing the
candid boundary is **already-encrypted ciphertext** — the backend never receives
cleartext:

- `SetTransactionPersonalNoteRequest { token_id: TokenId, transaction_id: String, encrypted_note: Vec<u8> }`.
- `GetTransactionPersonalNotesRequest { network: NetworkSettingsFor }` — returns
  only that network's notes for the caller (Decision 9).
- `DeleteTransactionPersonalNoteRequest { token_id, transaction_id }`.
- `TransactionPersonalNoteEntry { token_id, transaction_id, encrypted_note: Vec<u8> }`
  — the shape returned by `get`.
- `TransactionPersonalNoteError` enum (e.g. `NoteCiphertextTooLarge`,
  `TooManyNotes`, `RateLimited(RateLimitError)` reusing the shared
  [`signer::RateLimitError`](../../../../src/shared/src/types/signer.rs),
  `UserNotFound`) following `ContactError`. **No `NotFound`** — delete is
  idempotent (Decision 8).
- `const MAX_TRANSACTION_PERSONAL_NOTE_CIPHERTEXT_BYTES: usize` — a generous bound
  sized for 500 cleartext chars + the JSON envelope + AEAD overhead. (The
  500-**character** cleartext cap is a frontend constant; the backend can only
  bound bytes — Decision 3.)
- `const MAX_TRANSACTION_PERSONAL_NOTES_PER_USER: usize = 10_000;` — the per-user
  cap (Decision 10).

**Result enums** — in [`src/shared/src/types/result_types.rs`](../../../../src/shared/src/types/result_types.rs):
`SetTransactionPersonalNoteResult`, `GetTransactionPersonalNotesResult`,
`GetTransactionPersonalNotesCountResult`, `DeleteTransactionPersonalNoteResult`,
each with
`From<Result<…, TransactionPersonalNoteError>>`, mirroring the contacts result
enums. (If `EncryptedMaps` exposes its own result/error types, wrap rather than
leak them so the candid surface stays ours.)

**Storage (`EncryptedMaps`)** — no custom `StableBTreeMap` / `Candid<T>` value
type; the library owns value storage and encryption:

- Add an `EncryptedMaps` instance as a field on `State`
  ([`src/backend/src/state/mod.rs`](../../../../src/backend/src/state/mod.rs)),
  initialise it in `STATE`, and add a count to the `From<&State> for Stats` impl.
- Allocate the `MemoryId`(s) the library needs in
  [`src/backend/src/state/memory.rs`](../../../../src/backend/src/state/memory.rs),
  starting at `MemoryId::new(14)`. `EncryptedMaps` may require **more than one**
  memory region — allocate the next contiguous ids and document each (confirm the
  exact count against the library — see
  [Open questions](#open-questions-facts-to-confirm)).
- The `EncryptedMaps` **owner** is the caller principal (per-user isolation). The
  per-entry map-key encodes `[NetworkSettingsFor | TokenId | tx_id]` into stable
  bytes — **network discriminator first** so one network's notes share a prefix —
  via a small helper in [`src/backend/src/types/storable.rs`](../../../../src/backend/src/types/storable.rs)
  (add a round-trip unit test). Derive `TokenId` via `impl From<&Token>` and
  `NetworkSettingsFor` from the `TokenId`.

**vetKey derivation endpoint(s)** — expose what the frontend needs to derive its
per-user symmetric key, typically a per-caller encrypted-vetkey `#[update]` and a
public-key `#[query]` (exact names/shapes per `ic-vetkeys` — confirm). Guard the
per-caller derivation with `caller_is_registered_user`.

**Domain module** `src/backend/src/transaction_personal_notes/` (`mod.rs` +
`service.rs`), following `contacts/`:

- `set_transaction_personal_note` — bound-check `encrypted_note` bytes
  (`> MAX_…_CIPHERTEXT_BYTES` → `NoteCiphertextTooLarge`); on a **new** key when
  the caller is already at `MAX_TRANSACTION_PERSONAL_NOTES_PER_USER`, reject with
  `TooManyNotes` (never evict — Decision 10; an edit to an existing key is always
  allowed). Otherwise upsert into the caller's encrypted map under the
  network-prefixed key.
- `get_transaction_personal_notes` — return the caller's entries **for the
  requested `network`** via a prefix range scan over the network key component
  (fall back to fetch-all-and-filter only if `EncryptedMaps` does not expose range
  scans — see Open questions).
- `delete_transaction_personal_note` — remove the entry; **idempotent** (return
  `Ok` even if absent — Decision 8). Assert the missing-key case in a test.
- `get_transaction_personal_notes_count` — return the caller's **total** note
  count across all networks (no decryption, no value fetch — count entries in the
  caller's map). Drives the client-side cap gate (Decision 11).

**API handlers** — `src/backend/src/api/transaction_personal_notes.rs`:

- `set_transaction_personal_note(SetTransactionPersonalNoteRequest) -> SetTransactionPersonalNoteResult`
  — `#[update(guard = "caller_is_registered_user")]`.
- `delete_transaction_personal_note(DeleteTransactionPersonalNoteRequest) -> DeleteTransactionPersonalNoteResult`
  — `#[update(guard = "caller_is_registered_user")]`.
- `get_transaction_personal_notes(GetTransactionPersonalNotesRequest) -> GetTransactionPersonalNotesResult`
  — `#[query(guard = "caller_is_not_anonymous")]`.
- `get_transaction_personal_notes_count() -> GetTransactionPersonalNotesCountResult`
  (a `u64` count) — `#[query(guard = "caller_is_not_anonymous")]`.
- the vetKey derivation endpoint(s) above.

**Rate limiting (Decision 12):** add `SET_TRANSACTION_PERSONAL_NOTE_RATE_LIMITER`
and `DELETE_TRANSACTION_PERSONAL_NOTE_RATE_LIMITER` to
[`src/backend/src/utils/rate_limiter.rs`](../../../../src/backend/src/utils/rate_limiter.rs)
(both `RateLimiter::new(30, 60 * 1_000_000_000)` → 30/min/caller). At the top of
each write handler call `LIMITER.with(rate_limiter::RateLimiter::check_caller)?`
and map a breach to `…Err(TransactionPersonalNoteError::RateLimited(e))`, exactly
as `bitcoin.rs` / `onramper.rs` do. Reads are not limited.

Wire the handlers so `export_candid!()` in
[`src/backend/src/lib.rs`](../../../../src/backend/src/lib.rs) picks them up, then
`npm run generate` to regenerate `backend.did`.

Tests: unit tests (map-key round-trip, ciphertext-byte bound, idempotent delete)

- integration `src/backend/tests/it/transaction_personal_notes.rs` (registered in
  `tests/it/main.rs`) covering anonymous rejection, set→get, edit→get, delete→get,
  the ciphertext-bound, the per-user cap (`TooManyNotes` on a new note at the cap,
  edit still allowed), the count endpoint, and the **rate limiter** (`RateLimited`
  after exceeding the per-minute limit) — modeled on
  [`src/backend/tests/it/transactions.rs`](../../../../src/backend/tests/it/transactions.rs)
  and `contacts.rs`. The vetKey/`EncryptedMaps` flows need a **vetKD test key
  configured in the pocket-ic setup** — follow the `ic-vetkeys` testing guidance and
  extend [`tests/it/utils/pocketic.rs`](../../../../src/backend/tests/it/utils/pocketic.rs)
  if needed (confirm — see [Open questions](#open-questions-facts-to-confirm)).

Backend gates: `./scripts/format.sh && ./scripts/lint.rust.sh && ./scripts/lint.did.sh && ./scripts/test.backend.sh`.

### PR-2 (frontend) — vetKeys crypto + API + service + store

**Dependency (approved, Decision 6):** add `@dfinity/vetkeys` to `package.json`.

- **Crypto helper** `src/frontend/src/lib/services/transaction-personal-notes.vetkeys.ts`
  (or `*.utils.ts`): derive the **per-user** symmetric key via `@dfinity/vetkeys`
  (fetch the encrypted vetKey from the backend endpoint, decrypt with a transport
  key, derive the AES key), and **cache it as a non-extractable `CryptoKey` in
  IndexedDB** so it is fetched only once per device (the pattern from DFINITY's
  encrypted-notes sample). Expose `encryptNote(text) -> bytes` and
  `decryptNote(bytes) -> text`.
- **API wrappers** in [`src/frontend/src/lib/api/backend.api.ts`](../../../../src/frontend/src/lib/api/backend.api.ts):
  `setTransactionPersonalNote`, `getTransactionPersonalNotes`,
  `getTransactionPersonalNotesCount`, `deleteTransactionPersonalNote`, plus the
  vetKey-derivation call (mirror the contacts wrappers). These move **ciphertext**
  only.
- **Service** `src/frontend/src/lib/services/transaction-personal-notes.services.ts`
  (modeled on [`manage-contacts.service.ts`](../../../../src/frontend/src/lib/services/manage-contacts.service.ts)):
  `loadTransactionPersonalNotes({ network })` (fetch that network's entries →
  `decryptNote` each), `saveTransactionPersonalNote` (`encryptNote` → send),
  `deleteTransactionPersonalNote`, with `toastsError` handling. Decryption failures
  are surfaced per-note (one bad entry must not blank the whole list).
- **Store** `src/frontend/src/lib/stores/transaction-personal-notes.store.ts` —
  **decrypted** notes indexed by a stable `${tokenId}:${normalizedTxId}` key for
  O(1) modal lookup. The store holds cleartext **in memory only**. It also tracks
  the **total note count** (from `getTransactionPersonalNotesCount`) and exposes a
  derived `atNotesCapacity` flag (`count >= MAX_TRANSACTION_PERSONAL_NOTES_PER_USER`).
  Load the count on init and **refresh it after every add and delete** so the gate
  (Decision 11) stays accurate.
- A single shared **id-normalization helper** (e.g. in
  [`src/frontend/src/lib/utils/transaction.utils.ts`](../../../../src/frontend/src/lib/utils/transaction.utils.ts))
  used by both the write path and the store key, so the send-time key and the
  details-view key cannot drift. The same `(tokenId, txId)` bytes must be encoded
  identically here and in the backend map-key helper.
- Add `MAX_TRANSACTION_PERSONAL_NOTE_LENGTH = 500` to
  [`src/frontend/src/lib/constants/app.constants.ts`](../../../../src/frontend/src/lib/constants/app.constants.ts)
  (cleartext cap, enforced here).
- Load notes **per network**, scoped to the user's **enabled networks** (the same
  `enabledNetworks` / `user-networks.derived.ts` gating that already scopes
  tokens, balances, and transactions), lazily as the user enters a network's
  context — not all on wallet init, and not for disabled networks. Cache per
  network in the store so re-entry is free. Derive/cache the vetKey lazily on
  first note read or write.
- Disabling a network hides its transactions (and therefore its notes) from the
  UI, but the notes remain stored and reappear if the network is re-enabled — no
  data loss, visibility just tracks the network's enabled state.

Tests: crypto helper round-trip (`encrypt`→`decrypt`) with a mocked vetKey,
service mappers + store, decryption-failure isolation, following existing
`*.services.spec.ts` conventions.

### PR-3 (frontend) — Send-form input + persist on send

- New input component `src/frontend/src/lib/components/send/InputTransactionPersonalNote.svelte`
  modeled on [`InputContactName.svelte`](../../../../src/frontend/src/lib/components/address-book/InputContactName.svelte),
  but multi-line (textarea) and optional. **Length feedback matches
  `InputContactName` — no live character counter.** Show a "too long" error only
  once the value exceeds `MAX_TRANSACTION_PERSONAL_NOTE_LENGTH` (a
  `$maxCharacters`-placeholder i18n string revealed with a `slide` transition, in
  the error color), and block save/persist while too long. Otherwise reuse the
  existing input chrome (rounded container, label above the field).
- Thread an optional bindable `note` through:
  `SendModal.svelte` ($state) → `SendWizard.svelte` →
  each `*SendTokenWizard.svelte` → each `*SendForm.svelte` → shared
  `SendForm.svelte` (rendered after the `sendAmount` snippet). On
  `SendReview.svelte`, show the note **read-only** as a labeled "Note" block in
  the review summary, full text, wrapped, preserving line breaks — **omitted
  entirely when no note was entered** (no empty row).
- **Line item, not a big button:** the note shows as a compact line item — the
  **`Personal note` label on the left** and, on the right, a **`+ Add` button**
  when empty or an **edit pencil** once a note exists (the same pattern as the
  details row). Tapping it opens the `InputTransactionPersonalNote` field; once a
  note exists the text shows below the label. At the cap (`atNotesCapacity`) the
  `+ Add` button is **disabled** with the shared cap message (see
  [UI copy](#ui-copy-i18n)).
- **Editor controls = `Clear` / `Cancel` / `OK`** (not "Save" — nothing is
  persisted at this step; the note just rides along in the send-form state until
  the post-send write). `OK` confirms the edit, `Cancel` discards it, and
  **`Clear` empties the field but stays in edit mode** (it does not close the
  editor — `Cancel` is how you exit without changes). Same controls in the mobile
  bottom sheet.
- **Cap gate (Decision 11):** when `atNotesCapacity` is true, the **`+ Add`
  button is inactive (disabled)** and the shared cap-reached message is shown as
  **inline text** beneath it (not a tooltip — see [UI copy](#ui-copy-i18n)). The
  send itself proceeds normally (the note is optional); the user just can't attach
  a new note until they free a slot.
- In each `*SendTokenWizard.svelte` `send()`: after the service returns the
  network identifier and the send is confirmed successful, if `note` is
  non-empty call `saveTransactionPersonalNote({ tokenId, transactionId, note })` using
  the shared normalization helper. **A note-write failure must not fail or roll
  back the (already-broadcast) transaction** — the send always succeeds. On
  failure, show a **non-blocking** error toast with a **Retry**; if it still
  doesn't go through, the note simply isn't stored and the user can **add it later
  from the transaction's details** (the always-available path — possibly
  prefilled with the attempted text). So a failed note write is never data-loss of
  the transaction and never strands the user, and **no persistent client-side
  retry queue is required for v1**.
- i18n: add the strings from [UI copy](#ui-copy-i18n) (label, placeholder, helper,
  too-long error, shared cap message) to
  [`src/frontend/src/lib/i18n/en.json`](../../../../src/frontend/src/lib/i18n/en.json),
  then `npm run i18n:types`.

Tests: form renders/binds the optional note; empty note → no backend call; send
still succeeds when the note write rejects.

### PR-4 (frontend) — Show, edit, delete in transaction details

- A shared `TransactionPersonalNoteRow` used by all four `*TransactionModal.svelte`,
  rendered as the **last `<ListItem>` in the existing `<List>`** (after the
  Network / Timestamp / ID / Fee rows), reading from the notes store by the
  normalized id. It is a **normal line item**: the **`Personal note` label always
  sits on the left**, and the **right side carries a single action** — an **edit
  pencil** (`IconPencil`) when a note exists, or a **`+ Add` button** (`IconPlus`)
  when none does. Any note **text renders below** that label line (full width,
  wrapped, preserving line breaks). Give the `ListItem` a `flex-col` `styleClass`
  so the label/action line sits above the body. States:
  - **Empty:** label + right-aligned `+ Add` button — a first-class path on _any_
    transaction (sent or received, including ones from before this feature
    shipped). At the cap the Add button is **inactive (disabled)** with the shared
    cap message as inline text (Decision 11).
  - **Present:** label + right-aligned **edit pencil**; the note text below.
  - **Editing / adding:** the body below the label switches to the
    `InputTransactionPersonalNote` textarea + helper, with **Cancel / Save** (Save
    disabled while empty-unchanged or too long) and — **when editing an existing
    note — a `Delete` (`IconTrash`) action inside the form**. Delete is **not** a
    row action; the row's right side stays a single edit/add affordance. "Add" and
    "edit" share this form and the same `saveTransactionPersonalNote` upsert.
    (Reuse the same lucide icon components the contacts/address-book UI uses,
    `$lib/components/icons/lucide/`.)
  - **Loading:** while the network's notes are still being fetched/decrypted, show
    a small skeleton/placeholder in the row — no flash of the empty "add" state.
  - **Failed to decrypt:** if a single note can't be decrypted, show "Couldn't
    decrypt this note" + a **Retry** action in that row. The encrypted entry is
    left **intact and not overwritten** (no add/edit offered for that row until it
    resolves); other notes are unaffected (per-note isolation). Retry re-attempts
    decryption (re-deriving the vetKey if needed).
- **Cap gate (Decision 11):** when `atNotesCapacity` is true, the empty-state
  **`+ Add` button is inactive (disabled)** with the shared cap message as inline
  text. **Editing and deleting existing notes stay enabled** — editing is not a
  new entry, and deleting (from the edit form) is how the user gets back under the
  cap.
- Wire save → `saveTransactionPersonalNote`, delete (from the edit form) →
  `deleteTransactionPersonalNote`, with optimistic store updates and rollback on
  rejection. **Delete is immediate — no confirmation dialog — but reversible:**
  after deleting, the row returns to its empty state and shows "Note deleted" + an
  **"Undo"** action inline, with the just-removed cleartext kept in local memory so
  Undo re-saves it. The undo affordance stays available **while the details modal
  remains open** and is discarded on close. (Undo re-adds into the now-freed cap
  slot, so it always succeeds.)
- i18n: the [UI copy](#ui-copy-i18n) strings for the details view (row label,
  add/edit/delete actions, "Note deleted" + "Undo", shared cap message), then
  `npm run i18n:types`.
- Update [`docs/ai/PRODUCT.md`](../../../../docs/ai/PRODUCT.md) in **this** PR to
  describe the personal-note behaviour across all networks and both directions
  (addable/editable/deletable from transaction details on any transaction, plus
  an optional send-time shortcut; off-chain; **end-to-end encrypted via vetKeys**
  so the canister and node providers never see cleartext; 500-char cap).

Tests: modal renders empty/present/editing states; edit and delete call the
service and update the store.

### Quality gates (every PR)

```bash
# Frontend (PR-2, PR-3, PR-4)
npm run format && npm run lint -- --max-warnings 0 && npm run check && npm run test
# Backend (PR-1)
./scripts/format.sh && ./scripts/lint.rust.sh && ./scripts/lint.did.sh && ./scripts/test.backend.sh
```

---

## Delivery plan (atomic PRs / waves)

| Wave | PR                                                         | Layer    | Depends on | Parallel-safe with                          |
| ---- | ---------------------------------------------------------- | -------- | ---------- | ------------------------------------------- |
| 1    | **PR-1** — backend encrypted storage (EncryptedMaps) + API | backend  | —          | —                                           |
| 2    | **PR-2** — frontend vetKeys crypto + service + store       | frontend | PR-1 (did) | —                                           |
| 3    | **PR-3** — send-form input + persist                       | frontend | PR-2       | PR-4 (different files, but both touch i18n) |
| 3    | **PR-4** — details show/edit/delete                        | frontend | PR-2       | PR-3                                        |

- This spec doc lands first (or alongside PR-1).
- PR-2 needs the regenerated `backend.did` from PR-1.
- PR-3 and PR-4 both depend on the PR-2 store/service; they touch mostly
  disjoint files but coordinate on the shared `InputTransactionPersonalNote`
  component and `en.json`.
- **PR-4 is the primary, self-contained feature** (add/edit/delete on any
  transaction from details, sent or received) and can ship on its own. **PR-3 is
  an additive send-time shortcut** layered on top. If the shared
  `InputTransactionPersonalNote` component lands with PR-4, PR-3 only reuses it —
  so landing PR-4 first is the cleaner order.

---

## Out of Scope

1. Putting the note **on-chain** (it is purely an off-chain personal annotation).
2. A **send-time input for received** transactions (there is no such moment;
   received-tx notes are added from the details modal — itself fully in scope).
3. **Search / filtering** transactions by note (not possible server-side anyway —
   the backend only holds ciphertext).
4. **Automatic** backfilling of notes onto historical transactions (manual add
   from details is in scope).
5. Reusing or changing the existing SOL `UserTransaction` store (or extending it
   to other networks). Notes use the separate `EncryptedMaps` store by design
   (Decision 4). `UserTransaction` is unsuitable: it is SOL-only and
   finalized-tx-only, plaintext, and — critically — **capped at
   `MAX_USER_TRANSACTIONS_PER_TOKEN = 10,000` with oldest-evicted-at-capacity**,
   so a note stored there would be silently lost once the user crossed that many
   transactions for a token.
6. **Sharing notes between users** (`EncryptedMaps` supports it; we use a per-user
   key and do not expose sharing). Exporting notes, rich text, or attachments.
7. **Encrypting the existing contacts store** (a separate, larger migration; this
   feature is the first encrypted store but does not retrofit others).

---

## Acceptance Criteria

- [ ] Backend exposes `set_transaction_personal_note` / `delete_transaction_personal_note`
      (`#[update]`, registered-user guard), `get_transaction_personal_notes` /
      `get_transaction_personal_notes_count` (`#[query]`, not-anonymous guard), and
      the vetKey-derivation endpoint(s); `backend.did` regenerated via
      `npm run generate` (not hand-edited).
- [ ] The write endpoints (`set`/`delete`) are per-caller rate-limited via the
      existing `RateLimiter` and return `RateLimited` when the limit is exceeded;
      reads are unguarded by rate limits.
- [ ] Notes are stored **encrypted** via vetKeys `EncryptedMaps`, owned by the
      caller principal and keyed by `(TokenId, tx_id)`; the canister and node
      providers only ever see **ciphertext**, and one user cannot read or write
      another user's notes.
- [ ] A **per-user** symmetric key is derived via vetKD and cached as a
      non-extractable `CryptoKey` in IndexedDB (fetched once per device);
      encryption/decryption happen only in the browser.
- [ ] A note longer than 500 cleartext characters is blocked client-side with a
      clear error; the backend independently rejects any ciphertext above the max
      byte bound (`NoteCiphertextTooLarge`).
- [ ] At the per-user cap (`MAX_TRANSACTION_PERSONAL_NOTES_PER_USER = 10,000`) the
      backend rejects a **new** note (`TooManyNotes`) and **no existing note is
      evicted**; editing an existing note still succeeds.
- [ ] At the cap, the frontend **disables new-note creation at both entry points**
      (send form and the details "add" affordance) with a clear explanation of
      why; **editing and deleting existing notes remain enabled**. The gate is
      driven by `get_transaction_personal_notes_count` and stays correct after
      add/delete.
- [ ] `get_transaction_personal_notes` takes a `NetworkSettingsFor` and returns
      **only that network's** notes for the caller (not all networks, not
      per-token); the entry key is network-prefixed so this is a range scan where
      the library allows it.
- [ ] The send form shows an **optional** multi-line note input on **all four**
      network flows; leaving it empty issues **no** backend write.
- [ ] After a successful send, a non-empty note is persisted keyed to that
      transaction's identifier; a note-write failure does **not** fail or roll
      back the broadcast transaction (non-blocking error only).
- [ ] The transaction details modal supports **add / edit / delete** of a note on
      **any** transaction — **sent or received**, on all four networks, including
      transactions from before this feature shipped — with the store updated
      accordingly.
- [ ] For the **send-form** path, the id used to write the note equals the id the
      details view later uses to read it back, per network (verified for BTC
      txid, EVM hash, SOL signature, ICRC block index). (Details-modal-added notes
      write and read with the same id, so parity is inherent there.)
- [ ] `docs/ai/PRODUCT.md` describes the feature (landed in PR-4).
- [ ] All quality gates pass for each PR.

---

## Open questions (facts to confirm)

1. **`ic-vetkeys` / `EncryptedMaps` API contract** (settled approach — encrypt
   via vetKeys; these are integration facts to confirm during PR-1/PR-2):
   - The exact `EncryptedMaps` Rust API — instantiation, how many `MemoryId`s it
     needs, the owner/map-key/value signatures, and whether it ships
     ready-to-expose endpoints or expects us to wrap its calls.
   - **Whether `EncryptedMaps` supports a prefix / range scan over the inner
     map-key** (needed for the per-network `get` to be a true range scan,
     Decision 9). If it only supports whole-map-per-owner or exact-key access, the
     per-network load degrades to fetch-the-whole-map-and-filter client-side —
     still correct, but without the backend-side narrowing; decide if that's
     acceptable for v1 or if a custom layout is warranted.
   - The `@dfinity/vetkeys` frontend API for transport-key generation, vetKey
     decryption, and symmetric-key derivation, plus the IndexedDB
     `CryptoKey`-caching pattern (mirror DFINITY's encrypted-notes sample).
   - The **vetKD key name / configuration** to use on mainnet vs in pocket-ic
     tests, and how to provision a test key in the integration harness.
   - **Metadata leakage:** even with values encrypted, `EncryptedMaps` map keys
     (here `(TokenId, tx_id)`) and the owner principal are visible to the
     canister — i.e. the canister can see _that_ a principal annotated a given tx,
     just not the content. Decide whether that is acceptable (it is small relative
     to the per-user token/tx data OISY already stores) or whether to **blind** the
     key (e.g. store a hash of `(TokenId, tx_id)` instead of the raw value).
   - **Key rotation / loss:** with a per-user key, confirm the recovery story if a
     device cache is cleared (key is re-derivable from vetKD, so notes remain
     decryptable) and that there is no scenario that silently orphans ciphertext.
2. **Per-network id parity (send-form path only).** Verify the exact identifier
   each `send()` returns matches the identifier the corresponding
   `*TransactionModal` uses to display the tx, including formatting (EVM hash
   case/`0x`, ICRC block-index stringification, BTC txid endianness, SOL
   signature encoding). This determines the shared normalization helper. If any
   network's send path does **not** return a usable id synchronously, flag it —
   that network's send-time write may need to hook a later confirmation step (its
   note can still be added later from the details modal regardless). Notes added
   from the details modal are unaffected — they read and write with the same id.
3. **`TokenId` availability at send time.** Confirm the send wizard has the
   token's `TokenId` (or can derive it) to construct the key on the write path,
   matching what the details view holds.
4. **Existing GitHub issue / design.** Check `dfinity/oisy-wallet` issues for any
   prior discussion or design constraints on transaction notes before building.

## Pending decisions (facts clear — owner must decide)

_None remaining. The per-user cap was set to **10,000** (Decision 10)._

---

## Post-Merge (per workflow Step 7 — Post-merge cleanup (Claude Code))

- `PRODUCT.md` is updated in PR-4 (the behaviour-completing change), not
  post-merge.
- This spec ships with an asset folder
  `2026-06-16-feat-transaction-personal-note/wireframes/` (the send-form and
  transaction-details HTML mocks). Remove that folder post-merge — the shipped
  app and `PRODUCT.md` become the source of truth.
