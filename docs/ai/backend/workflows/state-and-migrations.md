# Workflow: Persisted state & migrations

The canister's **state lives across upgrades**. Any change to the shape
of persisted data is a migration and must be done deliberately.

## Where state lives

- The single `thread_local!` `STATE` cell in
  [`state/mod.rs`](../../../../src/backend/src/state/mod.rs).
- Each persisted collection is keyed by a `MemoryId` from
  [`state/memory.rs`](../../../../src/backend/src/state/memory.rs).
- Type aliases for the maps / cells are in
  [`types/maps.rs`](../../../../src/backend/src/types/maps.rs).
- Custom Rust types are made `Storable` via the generic
  [`Candid<T>`](../../../../src/backend/src/types/storable.rs) wrapper.

## Adding a new persisted collection

1. **Pick a fresh `MemoryId`.** Add a constant in
   [`state/memory.rs`](../../../../src/backend/src/state/memory.rs) at the
   end:

   ```rust
   pub const MY_NEW_COLLECTION_MEMORY_ID: MemoryId = MemoryId::new(<next-number>);
   ```

   **Never reuse a previously-used `MemoryId`.** Stable memory at that
   slot may still hold legacy data.

   **"The next number" is not safe on its own.** The namespace is shared and
   append-only, and nothing in the toolchain protects it: two branches can each
   take what looks like the next free id, and both compile, both lint and both
   pass their own tests. It only breaks once they meet on `main` and deploy, as
   two structures decoding each other's bytes. This has happened — tips took id
   20 while `CONTACT_IMAGE_MEMORY_ID` took id 20 on `main`. `every_memory_id_is_claimed_once`
   in `state/memory.rs` now catches it, but it catches it at _merge_ time, so
   check what has landed on `main` before picking a number, and re-check after
   a long-lived branch merges `main` in.

   Each id also claims a whole **bucket** — 128 pages, 8 MiB — the first time
   its structure is initialised, and _when_ that happens depends on how the
   store is held:

   - **Eagerly**, for a structure built inside the `STATE` thread_local (`tips`,
     `tips_by_sender`). `#[init]` calls `set_config`, which calls
     `mutate_state`, which forces the whole of `STATE` to build — so
     `StableBTreeMap::init` writes its header and the bucket is claimed **at
     install**, before anyone calls anything.
   - **Lazily**, for a store held as an `Option` and attached on first use (the
     vetKeys `EncryptedMaps`: `personal_notes`, `tip_secrets`). Those claim
     their bucket the first time the feature is actually used.

   The distinction matters because a bucket is claimed by growing stable memory,
   which needs _reserved cycles_. On a canister with a tight
   `reserved_cycles_limit`, the eager case fails the install outright, while the
   lazy case fails at first use — long after deployment looked fine.

2. **Define the type alias** in
   [`types/maps.rs`](../../../../src/backend/src/types/maps.rs):

   ```rust
   pub type MyNewCollectionMap = StableBTreeMap<KeyType, Candid<ValueType>, VirtualMemory<DefaultMemoryImpl>>;
   ```

3. **Add the field** to `state::State` in
   [`state/mod.rs`](../../../../src/backend/src/state/mod.rs) and initialise
   it in the `STATE` thread-local:

   ```rust
   pub(crate) my_new_collection: MyNewCollectionMap,
   …
   my_new_collection: MyNewCollectionMap::init(mm.borrow().get(MY_NEW_COLLECTION_MEMORY_ID)),
   ```

4. **Update `Stats`** if the new collection has a meaningful row count
   (`shared::types::Stats` + the `From<&State>` impl). Existing
   integration tests assert on `Stats`.

5. **Tests.** Cover the new collection's read / write paths in unit
   tests, plus at least one `pocket-ic` integration test that verifies
   the data survives a canister upgrade (`pic.upgrade_canister(...)`).

## Changing the shape of an existing collection

Three options, in order of preference:

1. **Backwards-compatible Candid evolution.** Add an optional field at
   the end. Existing serialised values still decode. No migration
   needed. This is the default; reach for it whenever possible.

2. **In-place migration on `post_upgrade`.** Read the legacy data, write
   the new shape, drop the legacy memory. Sketch:

   ```rust
   #[post_upgrade]
   pub fn post_upgrade(arg: Option<Arg>) {
       // Phase 1: extract legacy entries BEFORE STATE is initialised,
       // so STATE can reopen the same memory page with the new type.
       let migrated = state::my_migration::extract_legacy_entries();

       match arg { … }

       // Phase 2: insert converted entries now that STATE owns the (empty) map.
       state::my_migration::insert_migrated_entries(migrated);
   }
   ```

   Pattern:
   - Read raw bytes from the legacy `MemoryId` directly (don't reuse the
     old type definition — it may have changed).
   - Convert to the new shape.
   - Write into the new `MemoryId`.
   - Leave the legacy `MemoryId` empty (do not reuse).
   - Add a `// TODO: remove migration after all canisters have been
upgraded past this release.` comment so the cleanup is obvious, and
     drop the module + `post_upgrade` wiring in a follow-up PR once the
     rollout is complete.

3. **Bumped `MemoryId` + parallel migration.** Define a new `MemoryId`
   for the new shape, populate it from the old one in `post_upgrade`,
   read from the new one going forward.

## Tests for migrations

A migration without a test is half-done. Cover at least:

- **Pre-upgrade fixture** with the legacy shape.
- **Upgrade + read** — assert the new shape carries the same semantic
  values.
- **Idempotency** — running the migration twice (e.g. by upgrading
  twice) must not corrupt state.
- **Empty state** — if there's nothing to migrate, the migration is a
  no-op.

The integration tests under
[`src/backend/tests/it/`](../../../../src/backend/tests/it/) include
upgrade flows; mirror their setup (`pic.upgrade_canister(...)`) when
adding migration tests.

## Don'ts

- Don't reuse a `MemoryId` for a different shape. Stable memory persists
  across upgrades.
- Don't change a struct's field name or type "in place" without a
  migration plan — Candid records are name-keyed, and `Storable` decoding
  will fail.
- Don't run the migration outside `post_upgrade`. `init` is for fresh
  installs, not upgrades.
- Don't assume `Cell::init` writes the value you hand it. It **loads** the
  stored value whenever the region is non-empty and writes only when the region
  is fresh — so a `StableCell`'s contents are whatever the very first touch
  wrote, permanently, and no redeploy changes them. This is how a store gets
  stuck: the tip-secrets `KeyManager` was first initialised in a test
  environment under `dfx_test_key`, which exists only on a local replica, and
  every vetKD derivation there trapped with `InvalidKeyName` forever after. If
  you need a different value, you need a fresh region or a reinstall.
- Don't leave migration code in `lib.rs` indefinitely. Add a TODO
  comment with the release tag after which it can be removed, and clean
  it up when it's safe.
- Don't hold a state borrow across `.await` even in migration code.
  Read into a local, drop the borrow, perform the work, then write.

## Don'ts (Candid)

- Don't reorder existing fields on records or variants on enums — the
  candid compatibility check (and historic deserialisation) will break.
- New fields on records: only at the **end** to stay non-breaking.
- New variants on enums: only at the **end**.
- Renaming any of these is a breaking change. See
  [`breaking-interface.md`](./breaking-interface.md).
