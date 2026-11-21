> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Bind the II delegation guard to the derivation origin

- **Type:** `impr`
- **Area:** Backend (II delegation guard, config), Frontend (sign-in, guarded backend calls), deploy scripts
- **Status:** Draft for implementation in Claude Code

---

## 1. Motivation

The backend's II delegation guard (`src/backend/src/delegation.rs`) proves that the caller
holds a delegation issued by the configured Internet Identity canister. It checks the chain
length, the absence of targets, that the caller principal is the self-authenticating
principal of the chain's public key, that the root key belongs to a known II canister, that
the delegation has not expired, and that the canister signature verifies against the IC root
key.

It never checks **which frontend origin the delegation was derived for**, even though the
backend already stores a canonical `derivation_origin` in its config
(`src/shared/src/types/backend_config.rs`). `read_ii_verification_config` returns only the II
canister ids, the root key, and the enabled flag: the configured origin is dead config today.

II folds a caller-supplied frontend origin into the seed it derives the user's identity from.
One ordinary anchor can therefore ask II for many valid delegation chains, one per origin
string, each authenticating as a **different principal**, and every one of them passes the
current guard. Because the backend keys signer allowances and rate limits by principal, a
single anchor multiplies its quota: a fresh signer allowance over the shared patron account
per origin, and a fresh per-caller Bitcoin bucket per origin. This was reported through the
bug-bounty programme and accepted as a defence-in-depth hardening: the blast radius is OISY's
own operational cycles, not user funds or keys.

This spec makes the guard accept only delegations derived for OISY's own origins.

## 2. Why the guard cannot simply "read the origin"

This is the constraint that shapes the whole design, and it should be understood before
reviewing any implementation.

II derives the user key seed as

```
seed = SHA256( len(salt) ‖ salt ‖ len(anchor) ‖ anchor ‖ len(frontend) ‖ frontend )
```

(`calculate_anchor_seed` in II's `src/internet_identity/src/delegation.rs`). The salt is
generated inside the II canister and is never exposed. The signed delegation message is
`("ic-request-auth-delegation", pubkey, expiration, targets)`: the origin is **not** part of
it. The chain that reaches our backend therefore carries no origin, in plaintext or in any
form the backend can invert or recompute.

Consequences:

- No additional check on the existing payload can recover the origin. A caller-supplied
  plaintext origin field would be trivially forged and is worthless.
- The only II endpoint that maps `(anchor, origin)` to a principal, `get_principal`, requires
  the caller to be an authenticated device of that anchor, so the backend cannot call it.

The origin binding has to come from a **second signed artifact** that II issues, which is
what Section 3 uses.

## 3. The mechanism: II certified attributes carry `implicit:origin`

Internet Identity exposes `prepare_icrc3_attributes` / `get_icrc3_attributes`. Together they
return:

- **`message`**: a Candid-encoded ICRC-3 `Value::Map`. Alongside any requested user
  attributes, II always adds three implicit entries: `implicit:origin` (Text, the relying
  party's origin), `implicit:nonce` (Blob, 32 bytes chosen by the relying party) and
  `implicit:issued_at_timestamp_ns` (Nat).
- **`signature`**: an IC canister signature over the domain-separated payload
  `[0x0e] ‖ "ic-sender-info" ‖ message`, where `0x0e` is the length of the 14-byte domain
  string.

The decisive property: that signature is made **under the same origin-derived user key** as
the delegation chain, i.e. the DER key already present in `IIDelegationChain.public_key`.
Requesting an empty attribute list is supported and yields a message with only the three
implicit entries, so the proof carries **no personal data**.

The backend already verifies that
`Principal::self_authenticating(chain.public_key) == caller`. Verifying this second signature
under the very same `chain.public_key` therefore binds, transitively and cryptographically:

```
caller principal  <->  user key  <->  implicit:origin
```

and it needs nothing beyond the IC root key the backend already holds. `verify_canister_sig`
from `ic-signature-verification` (already a workspace dependency, used by the guard) verifies
it.

**Version constraint.** `dfx.json` pins II `release-2026-03-06`, which does **not** expose
these methods. They are present from `release-2026-07-31` onwards. The pin has to move as
part of this work, and the deployed production II must be confirmed to expose them
(see Open questions).

## 4. What this fix does and does not achieve

- **Does:** collapse "one anchor, unlimited principals" back to "one anchor, one principal for
  OISY", by rejecting every delegation not derived for an OISY origin.
- **Does not:** stop an attacker registering many II anchors and getting one OISY principal
  each. That is Sybil resistance at the identity layer and belongs to II (captcha and
  similar), not to this guard. Sign-up rate monitoring and the `new_user_signups_allowed`
  kill switch remain the mitigation there.
- **Does not:** change anything for controllers, which keep bypassing the guard.

## 5. Scope of the change

### 5.1 Backend: the allowlist of origins

**Where:** `src/shared/src/types/backend_config.rs`, `src/shared/src/impls.rs`,
`src/backend/backend.did`, `scripts/build.backend.args.sh`.

The guard must accept the canonical derivation origin **and** the alternative origins, since
a user on an alternative origin (a signer domain, `beta.oisy.com`, an `.icp0.io` canister URL,
a `test_fe_*` deployment) signs in with `derivationOrigin` set and therefore gets a delegation
derived for the canonical origin, while a deployment that does **not** set one gets a
delegation derived for its own origin.

- Add `alternative_origins: Option<Vec<String>>` to `InitArg` and `Config`, mirroring the
  frontend's `VITE_AUTH_ALTERNATIVE_ORIGINS`. Keep it `Option` for backward compatibility with
  persisted config, exactly like `new_user_signups_allowed`.
- `scripts/build.backend.args.sh` already computes `DERIVATION_ORIGIN` per network; extend it
  to emit the matching alternative origins per network.
- This changes `backend.did`, so the PR is a **breaking-interface PR**: `!` in the title, a
  `BREAKING CHANGE:` line in the body, `npm run generate`, and the empty
  "I really want breaking changes" commit. See
  `docs/ai/backend/workflows/breaking-interface.md`.

The accepted set is `derivation_origin` plus `alternative_origins`. An empty or absent
`derivation_origin` must mean "reject", never "accept anything".

### 5.2 Backend: verify the origin proof

**Where:** `src/backend/src/delegation.rs`, `src/shared/src/types/delegation.rs`.

Add an `IIOriginProof { message: Vec<u8>, signature: Vec<u8> }` type next to
`IIDelegationChain`, and extend `require_ii_delegation` to take it. Verification steps, in
order, all failing closed:

1. Rebuild the signed payload as `[0x0e] ‖ "ic-sender-info" ‖ message`.
2. `verify_canister_sig(payload, signature, chain.public_key (DER), ic_root_key_raw)`. Note
   this reuses the chain's public key, which step 3 of the existing guard has already tied to
   the caller.
3. Candid-decode `message` into the ICRC-3 value; reject anything that is not a `Map`.
4. Read `implicit:origin` (Text) and require membership in the configured allowlist. Compare
   the exact origin string, no normalisation, no suffix matching.
5. Read `implicit:issued_at_timestamp_ns` (Nat) and require it to be within a freshness window
   of `now_ns`, and not in the future beyond a small clock skew.
6. Require `implicit:nonce` to be present and 32 bytes. Its role is replay scoping for the
   client flow; the binding to the caller comes from the signature key, not the nonce.

Unit tests mirror the existing table in `delegation.rs`: missing proof, bad signature, wrong
origin, expired issuance, malformed message, and the happy path.

### 5.3 Backend: thread it through the guarded endpoints

**Where:** `src/backend/src/api/signer.rs`, `src/backend/src/api/bitcoin.rs`.

All three guarded endpoints (`allow_signing`, `btc_add_pending_transaction`,
`btc_get_pending_transactions`) pass the proof alongside the chain. Their request records gain
an optional origin-proof field; controllers keep bypassing. Extend the integration tests in
`src/backend/tests/it/` (`utils/ii.rs` grows a helper that fetches a proof for a given origin
from the II canister, mirroring `get_delegation_chain`).

### 5.4 Frontend: obtain and carry the proof

**Where:** `src/frontend/src/lib/stores/auth.store.ts`,
`src/frontend/src/lib/utils/delegation.utils.ts`,
`src/frontend/src/lib/services/loader.services.ts`,
`src/frontend/src/lib/canisters/backend.canister.ts`.

The proof is fetched once per session at sign-in, next to where
`extractIIDelegationChain` already runs, and carried on the three guarded calls exactly as
`iiDelegationChain` is today. The origin requested must be the same one II derived the
identity for: the value `getOptionalDerivationOrigin` supplies when set, otherwise
`window.location.origin`.

If a proof cannot be obtained, the call proceeds without it and the backend rejects it. There
is no client-side fallback that weakens the guard.

## 6. Rollout

Fail-closed on day one would sign out every user whose client predates the change, so the
guard is staged:

- **PR1** (this PR): the spec.
- **PR2**: backend config gains `alternative_origins`, deploy scripts emit it. Breaking
  interface, no behaviour change.
- **PR3**: II pin bump in `dfx.json` plus the integration-test helper that fetches an origin
  proof.
- **PR4**: `IIOriginProof` type, verification logic and unit tests, not yet wired to any
  endpoint.
- **PR5**: frontend obtains and sends the proof.
- **PR6**: endpoints require the proof (the enforcing change), gated so it can be enabled on
  local and staging before production.

## 7. PRODUCT.md updates (land with the behaviour change)

No user-visible behaviour changes when the client is current, so `PRODUCT.md` needs at most a
sentence in the backend-protection description noting that guarded endpoints require a
delegation derived for an OISY origin.

## 8. Open questions (facts to confirm)

- **Can the relying party obtain the proof at all?** `prepare_icrc3_attributes` authorises the
  caller against the anchor's authentication methods. A dapp session identity holds only a
  delegation, so OISY may not be able to call II directly and may need the proof to come back
  through the authorize flow (II's frontend has an attributes channel handler). Confirm
  whether `@icp-sdk/auth` (v6 is pinned; v8 is current) exposes it, and whether it works for a
  plain passkey anchor with no OpenID credential linked.
- **Does the origin need an existing II account?** `PrepareIcrc3AttributeError` carries
  `GetAccountError::NoSuchOrigin`, which suggests the origin must already be known for the
  anchor. Confirm a first-time OISY user can produce a proof.
- **Which origin does II certify** for a client that signed in with `derivationOrigin` set:
  the derivation origin or the client origin? The `unmapped_origin` field and the legacy
  `icp0.io -> ic0.app` remap both affect this and decide whether 5.1's allowlist is needed at
  all or whether the canonical origin alone suffices.
- **Production II release:** confirm the deployed id.ai canister exposes these methods before
  PR6 enforces anything.

## 9. Pending decisions

- **Freshness window** for `implicit:issued_at_timestamp_ns`. A short window means re-fetching
  the proof mid-session; a window matching `AUTH_MAX_TIME_TO_LIVE` (1 hour) means one fetch per
  session. Recommendation: match the session lifetime, since the proof is already bound to the
  caller and adds no value as a freshness oracle.
- **Enforcement gate for PR6**: a config flag versus a straight cutover once client adoption is
  observed.
- **Optional versus required field** on the request records. Optional keeps the candid change
  additive-looking but leaves a permanently skippable path; required forces a clean cutover.
