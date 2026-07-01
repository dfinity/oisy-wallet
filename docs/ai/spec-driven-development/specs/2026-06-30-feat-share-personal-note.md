This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Share a personal note via link

## Goal

Let a signed-in user turn one of their existing **personal notes** into a
**share link** that anyone can open — even without an OISY account — to read the
note. The creator controls two things at creation time:

1. **How long the link works** — a required expiry (the link is dead afterwards).
2. **Whether it can be used more than once** — an optional "destroy after
   viewing" toggle that makes the link single-use.

The recipient opens the link in any browser, sees an **OISY-branded** read-only
view of the note text, and never has to sign in.

This builds directly on the personal-notes feature in **PR #13287**
(`2026-06-17-feat-personal-notes.md`), where sharing is explicitly listed as
[out of scope](#relationship-to-the-personal-notes-spec). It is the first feature
that exposes a note outside its owner's principal, so the crypto model is the
heart of this spec.

## Motivation

Personal notes are end-to-end encrypted with a **per-user vetKD key** (one key
per principal, derived in the browser, cached as a non-extractable `CryptoKey`).
That model is deliberately airtight: only the owning principal can derive the key,
and every read endpoint is guarded for a registered, non-anonymous caller. It is
therefore **structurally impossible** for a logged-out recipient to read a note
through the existing path — there is no key they could derive and no endpoint they
could call.

Sharing a note to someone without an account requires a **second, independent
encryption path** that does not touch the user's vetKD key: a fresh random key
per share, held only in the link, with the ciphertext stored under an opaque
token the canister can serve to anyone. This is the same "share key in the URL
fragment, never sent to the server" model shown in the reference wireframe.

## Background (today's code, on the PR #13287 branch)

### The personal-notes crypto path (what we are _not_ reusing for the recipient)

- [`src/frontend/src/lib/services/personal-notes.vetkeys.ts`](../../../../src/frontend/src/lib/services/personal-notes.vetkeys.ts)
  derives the per-user key via `@dfinity/vetkeys` (`EncryptedVetKey` →
  `DerivedKeyMaterial`) and encrypts/decrypts the note envelope with the
  `note_id` as the AES-GCM domain separator. This path is **per-principal** and
  cannot serve a logged-out recipient — it is reused only for the **owner-side**
  step of reading the note to be shared.
- The cleartext envelope is
  [`PersonalNoteEnvelope`](../../../../src/frontend/src/lib/types/personal-note.ts)
  = `{ note, created_at_ns, updated_at_ns }`.

### Backend storage conventions

- Candid-exposed types live in `src/shared/src/types/<area>.rs`; result enums in
  [`shared::types::result_types`](../../../../src/shared/src/types/result_types.rs).
  Personal-notes types are in
  [`src/shared/src/types/personal_note.rs`](../../../../src/shared/src/types/personal_note.rs).
- The notes API
  ([`src/backend/src/api/personal_notes.rs`](../../../../src/backend/src/api/personal_notes.rs))
  guards **every** endpoint with `caller_is_registered_user` or
  `caller_is_not_anonymous`, and rate-limits writes with the
  `SET_PERSONAL_NOTE_RATE_LIMITER` / `DELETE_PERSONAL_NOTE_RATE_LIMITER` pattern.
  The share-read endpoints are the **first** note endpoints that must be callable
  **anonymously** — a deliberate, scoped exception.
- Notes are stored in a vetKeys `EncryptedMaps` keyed by owner principal. Shares
  are **not** owned by the reader, so they need a separate, publicly-readable
  store (see [Open questions](#open-questions-facts-to-confirm)).

### Where the recipient page lives

- The repo already has an unauthenticated route group
  [`src/frontend/src/routes/(public)`](<../../../../src/frontend/src/routes/(public)>)
  with its own OISY-branded layout
  ([`(public)/+layout.svelte`](<../../../../src/frontend/src/routes/(public)/+layout.svelte>)
  renders the `OisyWalletLogo` header). The share-recipient page is a new route in
  this group, so it loads with **no identity** and inherits OISY branding for free.

### The note read-only view to mirror

- [`src/frontend/src/lib/components/notes/NoteView.svelte`](../../../../src/frontend/src/lib/components/notes/NoteView.svelte)
  already renders a note read-only with **safe rendering**: text is neutralized
  (`neutralizePersonalNoteText`), bidi/control chars stripped, line breaks via
  `whitespace-pre-wrap`, and URLs linkified to `rel="noopener noreferrer"
target="_blank"` anchors (`linkifyPersonalNote`). The recipient view reuses these
  exact utilities from
  [`personal-note.utils.ts`](../../../../src/frontend/src/lib/utils/personal-note.utils.ts)
  so a shared note can never execute scripts or reorder UI.

## Relationship to the personal-notes spec

`2026-06-17-feat-personal-notes.md` ("Out of Scope") states:

> **Sharing notes** between users (`EncryptedMaps` supports it; we use a per-user
> key and do not expose sharing) and exporting notes.

That refers to _principal-to-principal_ sharing inside `EncryptedMaps`. This spec
does **not** do that. It introduces an independent, link-based share path with a
per-share key, leaving the per-user note store and its vetKD key untouched. The
shared copy is exactly that — a **copy**; editing the original note later does not
change an already-created share.

**Sequencing:** this spec should land **after** PR #13287 merges, since it imports
that PR's note types, utils, and `NoteView`.

## Crypto model (the core of this spec)

A share is a self-contained encrypted blob whose key lives only in the link.

```
At creation (signed-in owner, all in the browser):
  1. Read + decrypt the chosen note via the existing per-user vetKD path.
  2. Build the cleartext content part:
        content = { v: 1, note: <text> }
  3. shareKey   = WebCrypto AES-GCM 256-bit random key   (never leaves browser)
  4. token      = 128-bit random, base64url               (opaque id, no secret)
  5. ct_content = AES-GCM(shareKey, content, AAD = token + ":note")
  6. Upload { token, ct_content, expires_at_ns, single_use } to the canister.
  7. Link  = https://oisy.com/notes/share/<token>#k=<base64url(shareKey)>
                                                  └── fragment, never sent to server
```

```
At open (anyone, logged out):
  1. Page reads <token> from the path and shareKey from location.hash (#k=…).
  2. On load the page shows a generic Locked screen — no backend call, no name.
  3. Recipient clicks "Reveal note":
       single_use  → consume_personal_note_share(token)  [update; returns ct_content once, deletes]
       reusable    → get_personal_note_share(token)       [query; re-readable until expiry]
  4. Decrypt ct_content with shareKey (AAD = token+":note") → render note text.
```

What the canister (and node providers) can see: that a share **exists**, its
ciphertext **size**, its **expiry**, its **single-use flag**, and **access
timing**. It cannot see the note text, **which note** it came from (the token is
independent random, unrelated to `note_id`), or the recipient's identity. The
creating principal _is_ known to the canister at creation time (the create call is
authenticated), but the content is not.

The fragment (`#k=…`) is never sent in an HTTP request and is excluded from the
`Referer` header (the page sets `Referrer-Policy: no-referrer`). Decryption is
client-side only.

## Snapshot semantics

A share link is a **point-in-time, independent copy** of the note, not a live
view. This follows directly from the crypto model: the per-share key is generated
in the browser, embedded in the link fragment, and **never retained** by the
client after the link is created — so there is nothing the owner could use to
re-encrypt updated content for an existing link.

Concretely, once a link is created:

- **Editing the note** does **not** change what the link shows. The recipient sees
  the text as it was at creation time.
- **Deleting the note** does **not** kill the link. The shared copy is stored under
  its own token, independent of the note, and lives until it expires or (if
  single-use) is consumed. With fire-and-forget (no revocation), there is no way to
  end a link early regardless — see [Out of Scope](#out-of-scope).
- The per-user note store and its vetKD key are never touched by creating or
  serving a share.

This is disclosed to the creator in the Share dialog (the caption under the
preview) so the snapshot behaviour is not surprising. Making links **live** (edits
propagate, delete revokes) was considered and rejected for v1: it would require a
recomputable per-share key derived from the user's vetKD key plus re-encryption on
every edit — a materially larger crypto surface (recorded under
[Pending decisions](#pending-decisions-facts-clear-owner-must-decide)).

## Design

### Entry point — "Share" action in the note view — see [wireframe](./2026-06-30-feat-share-personal-note/wireframes/note-view-with-share.html)

Add a **Share** action to
[`NoteView.svelte`](../../../../src/frontend/src/lib/components/notes/NoteView.svelte).
It is deliberately **lower-emphasis than Edit** — a quiet text link, not a button —
and its placement differs by breakpoint:

- **Desktop:** a **blue "Share note" text link** (share icon + label) on the note's
  **metadata row**, right-aligned opposite the "Created … · Updated …" line. **Edit
  note** and **Delete note** stay as they are below.
- **Mobile:** **Edit** moves into the modal **header** (top-right, just "Edit");
  **"Share note"** is a left-aligned blue text link directly under the "Created …"
  line; **Delete note** stays as the red button.

(Edit is a full button on desktop but a header link on mobile — an intentional,
accepted breakpoint difference.) The Share action is shown **only for a
successfully-decrypted note** (a `PersonalNoteUi`, never a decryption-failure
entry). Activating it opens the **Share note** flow.

### Share-note flow (creator) — see [wireframe](./2026-06-30-feat-share-personal-note/wireframes/share-dialog.html)

A dialog on desktop / bottom sheet on mobile (same responsive pattern as the
delete-note confirmation), with two states:

**State A — configure:**

- Title **"Share note"**, with a **note preview** for context (so it's clear the
  whole note is shared, not just its title): the first line as a **bold title** and
  up to **two lines of body** beneath it in lighter, normal-weight (tertiary) text.
  - The **title line** is single-line truncated with an ellipsis **exactly as the
    list view does it** —
    [`NoteListItem.svelte`](../../../../src/frontend/src/lib/components/notes/NoteListItem.svelte)
    uses Tailwind `truncate` (i.e. `white-space: nowrap; overflow: hidden;
text-overflow: ellipsis`) plus `overflow-wrap: anywhere`. Reuse that same
    treatment here for visual consistency.
  - The **body preview** is clamped to two lines (`-webkit-line-clamp: 2`) and
    ellipsizes when the note is longer; it reuses the note's safe rendering
    (`neutralizePersonalNoteText`) but is plain preview text (no clickable links in
    the preview).
- A caption directly under the preview makes the snapshot semantics explicit:
  **"Shares a copy of the note as it is now. Editing or deleting the note later
  won't change this link."** (See [Snapshot semantics](#snapshot-semantics).)
- **"Link expires after"** — a required segmented control:
  **1 hour / 24 hours / 7 days / 30 days**, default **24 hours**. No "never"
  option — expiry is mandatory.
- **"Destroy after viewing"** — an optional checkbox (default **off**). When on,
  the link is single-use.
- An **"OISY protects you!" info box** (not a plain explainer line): the standard
  pattern — green shield + bold **"OISY protects you!"** lead — on OISY's **blue**
  info background, body **"The share key lives in the link itself and is never sent
  to OISY, so only someone with the full link can read this note,"** plus a **Learn
  more** link.
- Footer: **Cancel** / **Create link**.

**State B — link created:**

- A read-only field showing the full link, with a **Copy link** button (reuse
  OISY's existing copy-to-clipboard control).
- A short recap: **"Expires in 24 hours · single-use"** (single-use shown only when
  selected).
- A reminder: **"Anyone with this link can read the note. OISY can't recover or
  revoke it once shared."**
- Footer: **Done**.

There is **no link-management or revocation UI** (decided: fire-and-forget — see
[Pending decisions](#pending-decisions-facts-clear-owner-must-decide)). The dialog
does not list previously-created links.

### Recipient view (logged out) — see wireframes: [desktop](./2026-06-30-feat-share-personal-note/wireframes/recipient-fullpage-1920x1200.html) · [mobile](./2026-06-30-feat-share-personal-note/wireframes/recipient-fullpage-mobile-390x844.html)

A new public route, e.g.
`src/frontend/src/routes/(public)/notes/share/[token]/+page.svelte`, rendered
inside the `(public)` layout (OISY logo header, branded background). It has **four
states**.

**Background & theme:** the page must use OISY's **existing** branded background,
not a bespoke gradient — and specifically the **landing** artwork, since the
recipient page is a signed-out public surface. Per
[`src/frontend/src/app.html`](../../../../src/frontend/src/app.html), the
`#app-background-container` mounts two pairs and switches on
`:root[theme='light'|'dark']`:

- `landing_bg_light.webp` / `landing_bg_dark.webp` — the **default / signed-out
  landing** background. **This is the one the recipient page uses.**
- `oisy_bg_light.webp` / `oisy_bg_dark.webp` — the "classic" **in-app** background,
  shown only on signed-in / lock views that opt in via `[data-app-view]`. **Not**
  the recipient page.

Reusing the landing background gives the recipient page **light and dark themes**
for free and keeps it visually consistent with the OISY landing/sign screens. (The
full-page wireframes inline the real `landing_bg_*` assets and include a light/dark
toggle to confirm both.)

**Header:** reuse OISY's existing landing header — the logged-out variant of
[`src/frontend/src/lib/components/hero/Header.svelte`](../../../../src/frontend/src/lib/components/hero/Header.svelte)
(OISY logo link, **Why OISY**, **Documentation**, `ThemeSwitchButton`, and the
account `Menu`). The recipient page should render this same header rather than a
stripped-down logo-only bar, so a shared-note visitor lands in a fully branded OISY
shell with a working theme switch and a path to sign in / learn more. The
`(public)/+layout.svelte` currently renders only the `OisyWalletLogo`; confirm
whether to switch this route to the hero header or lift the hero header into a
shared layout (see [Open questions](#open-questions-facts-to-confirm)).

1. **Locked (default on load):** a branded card with a single **"Reveal note"**
   button and the generic heading **"A note was shared with you"**. On load there is
   **no backend call** — the Locked screen is static, so the **note content is not
   fetched yet** and a chat-app link-preview/unfurler bot cannot consume a
   single-use link. The **Reveal note** click is what fetches the content (and, for
   single-use, burns it).
2. **Revealed:** the note text, rendered with the **same safe rendering** as
   `NoteView` (`neutralizePersonalNoteText` + `linkifyPersonalNote`,
   `whitespace-pre-wrap`, links `rel="noopener noreferrer" target="_blank"`).
   **No timestamps, no sender identity** (decided: text only). Layout, top to
   bottom:
   - The title is the generic **"Shared note"**.
   - **Single-use caveat as plain text** directly under the title
     (not a boxed alert) — **"Single-use link — once you close or reload this page,
     the note is gone for good. Copy it now if you need it."** Stating the
     point-of-no-return up front, before the note, so it's read before the content
     is acted on. (Only shown for single-use links; the server copy was already
     consumed at reveal, so a reload lands on **Unavailable**.)
   - The **note** itself.
   - **Long notes behave like the Notes modal:** the card is height-capped
     (≈ **80% of viewport height**, reusing the notes modal's `--dialog-max-height`
     convention) and **only the note text scrolls**, inside its own region — the
     title and single-use line stay pinned at the top, and the "OISY protects you!"
     box plus Copy / Done stay pinned at the bottom. Mirror the `NoteView`
     `ContentWithToolbar` scroll-region pattern rather than letting the whole page
     grow.
   - An **"OISY protects you!" reassurance box** beneath the note — the standard
     pattern (green shield, bold lead) on the blue background, body **"This note was
     decrypted right here in your browser — OISY only ever stored an encrypted
     copy,"** plus a **Learn more** link. This leads with the positive security
     story rather than only the negative "can't reopen" caveat. The **Learn more**
     link — and any URL linkified inside the note — opens in a **new tab**, so the
     recipient never navigates away from a note that may be single-use and
     uncopied. (Only the terminal **Discover OISY** CTA navigates in the same tab.)
   - **Copy note** — copies the full plaintext to the clipboard (reuse OISY's
     existing copy-to-clipboard control). Convenience, not a security change (the
     recipient already holds the plaintext on screen), but it matters most for
     **single-use** links, where the reveal is the recipient's only chance to
     capture the content and manual multi-line selection on mobile is error-prone.
   - **Done** — dismisses the note and advances to the **Outro** state (below).
   - There is **no** "Hide"/"Close" button: the page is a standalone URL the
     recipient navigated to, so a script can't reliably close the tab, and an
     in-session hide/show toggle added confusion for little value. **Done →
     branded outro** is the meaningful end-of-flow instead.
3. **Outro (after Done):** a **same-sized** branded card styled like the OISY
   landing page. It **bridges from notes to the wallet**: an eyebrow line ties back
   to what just happened — **"You just opened a note kept private by OISY"** — and
   the headline extends that to the product — **"It keeps your assets just as
   safe."** Below: a one-line multi-chain pitch (Bitcoin, Ethereum, Solana, ICP and
   more; 100% onchain), a few feature points, and a **single** primary
   call-to-action. The CTA is an **invitation, not a command** — labelled **"Discover
   OISY"** (it navigates to oisy.com to browse; deliberately not "Get started" /
   "Open OISY", which would imply a sign-up flow begins on click, and it does not).
   It opens **in the same tab** — the outro is the end of the flow with nothing to
   return to, so a new tab would only litter.
   There is no separate "Learn more" link, since it would point to the same
   destination as the button. Because the page renders the real OISY header (which
   already carries the logo top-left), the outro **does not repeat a large hero
   logo** — it leads with the eyebrow + headline. The note text is
   **cleared** from the DOM at this point. Rationale: a shared-note recipient is
   often someone who does **not** yet use OISY, so the natural end-of-read moment is
   a low-friction, on-brand invitation to open their own wallet — the soft
   acquisition surface lives here, **not** layered onto the note view (which stays
   strictly text-only).
4. **Unavailable:** a single neutral state for expired / already-used / unknown
   token / missing-or-bad fragment key — **"This link has expired or already been
   used."** The canister returns the same not-found for all of these, so the page
   does not distinguish them (avoids leaking whether a token ever existed). Offers a
   single **"Discover OISY"** button to oisy.com, **in the same tab** (same
   destination and behaviour as the outro CTA). It is styled **primary**, not ghost — since it's the only action on the
   page, a greyed-out secondary button reads as disabled. (Replaces an earlier
   ambiguous "What is OISY?" label that read like it opened docs.)

No new top-level i18n surface is created beyond a `notes.share.*` block; the
recipient page must work with **no wallet state loaded**.

### Backend (new endpoints, mirroring the notes conventions)

New shared types in `src/shared/src/types/personal_note_share.rs` (or extend
`personal_note.rs`), and result enums in `result_types.rs` following the existing
`SetPersonalNoteResult` / `From<Result<…>>` pattern.

| Endpoint                      | Kind     | Guard                                      | Purpose                                                                                                                                                                                                               |
| ----------------------------- | -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_personal_note_share`  | `update` | `caller_is_registered_user` + rate-limited | Store `{ token, ct_content, expires_at_ns, single_use, creator }`. Rejects oversized ciphertext (reuse a `…CiphertextTooLarge` bound), duplicate token, and **per-user active-share-cap overflow** (`TooManyShares`). |
| `get_personal_note_share`     | `query`  | **none (anonymous OK)**                    | Return `ct_content` + expiry for a **reusable**, unexpired token; else `NotFound`. Never returns a single-use share's content.                                                                                        |
| `consume_personal_note_share` | `update` | **none (anonymous OK)**                    | For a **single-use**, unexpired token: return `ct_content` once and **atomically delete** the entry; else `NotFound`.                                                                                                 |

`creator` (a `StoredPrincipal`, known from the authenticated create call) is stored
**only** to enforce the per-user cap and is **never** returned by any read
endpoint, so a recipient can't learn who created a share. Expiry is enforced
server-side against IC time on every read; expired entries return `NotFound` and are
pruned (lazily on access, plus a periodic timer — see
[Open questions](#open-questions-facts-to-confirm)). The anonymous read endpoints
are a deliberate, narrowly-scoped exception to the "notes endpoints are always
authenticated" rule and must be called out in review.

### Abuse guards (so a user can't flood the canister with shares)

Mirror the personal-notes protection model:

- **Per-user active-share cap** — a new `MAX_PERSONAL_NOTE_SHARES_PER_USER` constant
  (mirroring `MAX_PERSONAL_NOTES_PER_USER = 1_000`; **proposed value is a
  [pending decision](#pending-decisions-facts-clear-owner-must-decide)**). The cap
  counts a user's **active** (unexpired, not-yet-consumed) shares; expired/consumed
  shares free up slots. At the cap, `create_personal_note_share` returns
  `TooManyShares` (mirroring `TooManyNotes`).
- **Write rate limit** — a `CREATE_PERSONAL_NOTE_SHARE_RATE_LIMITER` using the same
  `rate_limiter::RateLimiter::check_caller` pattern as
  `SET_PERSONAL_NOTE_RATE_LIMITER`, returning `RateLimited(RateLimitError)`.
- **Ciphertext bound** — reuse `MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES` (10,000) for
  `ct_content`; over-bound returns `…CiphertextTooLarge`.

**UI indication (mirrors the notes cap):** when the creator is at the share cap, the
**Share** action is disabled and the dialog shows an inline cap message — e.g.
**"You've reached the maximum of {$max} active share links. They free up as they
expire or are used."** — exactly the pattern the notes feature uses for "You've
reached the maximum of {$max} saved notes." The client gates on a
`get_personal_note_shares_count` query (mirroring `get_personal_notes_count`).

### Stored value (crossing the candid boundary)

```rust
// Ciphertext fields are opaque to the canister; it enforces only expiry/flag/cap.
pub struct PersonalNoteShare {
    pub token: String,           // ≤ N bytes, opaque random id (the map key)
    pub ct_content: ByteBuf,     // AES-GCM ciphertext of { v, note };        opaque
    pub expires_at_ns: u64,      // absolute UTC epoch ns; enforced on read
    pub single_use: bool,
    pub creator: StoredPrincipal,// for the per-user cap only; never returned to readers
}
```

The share **key** is never in this struct — it exists only in the link fragment.
`ct_content` (the note) is encrypted with that key, so the canister never sees the
note.

## Implementation (atomic PRs)

Follow the same wave shape as the notes feature. Keep PRs small and atomic
(AGENTS.md commandments 2–3).

**PR-1 (backend) — share store + API.** New shared types + result enums; a
publicly-readable share store; the three endpoints (`create`, `get`,
`consume`) plus a `get_personal_note_shares_count` query, with guards, expiry
enforcement, the `CREATE_PERSONAL_NOTE_SHARE_RATE_LIMITER`, ciphertext-size bounds,
the per-user active-share cap (`TooManyShares`), and a pruning timer. Backend `it`
tests in `src/backend/tests/it/`. Run `npm run generate` after the candid changes —
never hand-edit `src/declarations/`.

**PR-2 (frontend) — share crypto + service + API.** A
`personal-note-share.vetkeys.ts`-style module for the **per-share** AES-GCM key
(WebCrypto, fresh key, base64url fragment encoding, `token+":note"` AAD) — distinct
from the per-user vetKD module. Service functions `createNoteShare`
(decrypt note via existing path → encrypt `ct_content` → upload → build
link) and `loadSharedNote` (get/consume → decrypt). Unit tests with injected known
keys (mirroring the existing `*WithKey` test seam).

**PR-3 (frontend) — creator UI.** The **Share** text-link entry point in `NoteView`
(desktop meta row / mobile header layout), the Share-note dialog/bottom-sheet
(configure + created states) including the **at-cap disabled state** + cap message,
copy-link control, i18n `notes.share.*`, test-ids. Component tests mirroring
`NoteView.spec.ts` / `NotesModal.spec.ts`.

**PR-4 (frontend) — recipient page.** The `(public)/notes/share/[token]` route with
the **four states** (locked → revealed → outro, plus unavailable), rendering the
real OISY header (`hero/Header.svelte` logged-out variant) over the branded
**`landing_bg_*`** background with **light/dark** support. On load it shows a static
Locked screen with no backend call; Reveal fetches/consumes the content. Reuse
`neutralizePersonalNoteText` / `linkifyPersonalNote` for safe rendering, the
Notes-modal height-cap + internal scroll for long notes, `Referrer-Policy: no-referrer`, and
graceful handling of a missing/garbled fragment key. Component tests for locked →
revealed → outro and the unavailable path.

**Quality gates (every PR):** frontend `format` / `lint` / `check` / `test`;
backend `cargo fmt` / `clippy` / tests; update
[`docs/ai/PRODUCT.md`](../../PRODUCT.md) "Personal notes" section **in the same PR**
as the behaviour change.

## Out of Scope

1. **Link management / revocation.** No list of active links, no early kill switch
   (decided: fire-and-forget). Once shared, a link lives until it expires or is
   used. This is a real risk and is stated as such in the creator UI copy.
2. **Principal-to-principal sharing** inside `EncryptedMaps` (sharing to another
   OISY user by identity).
3. **Password / passphrase-protected links**, recipient authentication, or
   per-recipient distinct links.
4. **Live sync** between a shared copy and the original note — a share is a
   point-in-time snapshot.
5. **Sharing anything but a single note's text** — no timestamps, attachments,
   bundles of notes, or note metadata in the recipient view.
6. **Export** of notes (already out of scope in the notes spec).
7. **View receipts / access analytics** for the creator (no "your link was opened"
   notification).

## Acceptance Criteria

1. From a decrypted note's view, a **Share** action opens the Share-note flow; it
   is absent for a note that failed to decrypt.
2. The creator must pick an expiry (1h / 24h / 7d / 30d, default 24h) and may toggle
   "Destroy after viewing" (default off). **Create link** produces a link of the form
   `…/notes/share/<token>#k=<key>` that can be copied.
3. The plaintext note text and the share key are **never** sent to the canister:
   the create call carries only ciphertext, expiry, and the single-use flag, and
   the key appears only in the URL fragment. (Verify in a network trace / backend
   test that the stored value is opaque.)
4. Opening the link **logged out** shows an OISY-branded locked card; no note data
   is fetched until **Reveal note** is clicked (so unfurlers can't burn a
   single-use link).
5. After **Reveal note**, the note text renders with the same safe rendering as
   `NoteView` (escaped, bidi-neutralized, links open in a new tab with
   `rel="noopener noreferrer"`). No timestamps and no attribution are shown — the
   revealed note is text-only. A **Copy note** action copies the full plaintext. For a
   long note, the card caps at
   ≈ **80% viewport height** and the note scrolls **internally** while the title and
   actions stay pinned (mirrors the Notes modal).
6. A **single-use** link decrypts exactly once; a second open shows the
   **unavailable** state. A **reusable** link opens repeatedly until expiry.
7. After expiry, both link types show the **unavailable** state, and the backend
   returns `NotFound` (and the entry is eventually pruned). Expired/used/unknown
   token / bad-key all collapse to the **same** unavailable state — the page does
   not reveal which.
8. The recipient page works with **no wallet state and no identity** loaded, and
   sets `Referrer-Policy: no-referrer`.
9. **Snapshot:** the original note and the per-user vetKD store are **unaffected**
   by creating or opening a share; **editing** the note after a link is created does
   not change what the link shows, and **deleting** the note does not kill the link
   (it lives until expiry / single-use consumption). The Share dialog discloses this
   with the "shares a copy as it is now" caption.
10. **Done** clears the note from the DOM and shows the **outro** (eyebrow +
    headline + features + a **Discover OISY** CTA to oisy.com); the **unavailable**
    state also offers a primary **Discover OISY** button. Neither the note view nor
    the outro shows a "sign up" CTA.
11. The recipient page renders the **real OISY header** (logged-out variant) over the
    branded `landing_bg_*` background and works in **both light and dark** themes.
12. **Abuse guards:** creating shares is rate-limited, and at the per-user active-
    share cap `create_personal_note_share` returns `TooManyShares` while the UI
    disables the Share action and shows the cap message. The `creator` principal is
    never exposed by any read endpoint.
13. Negative guarantee: there is **no** revocation/management UI, and there is **no**
    endpoint that lists shares or maps a token back to a `note_id`.

## Open questions (facts to confirm)

1. **Share store primitive.** `EncryptedMaps` is keyed/guarded by owner principal,
   which doesn't fit a publicly-readable, token-keyed store. Confirm the right
   structure — likely a dedicated `StableBTreeMap<token, PersonalNoteShare>` in a
   new stable memory region. Confirm memory-id allocation and migration impact.
2. **Anonymous update calls** (`consume_personal_note_share`). Confirm the IC /
   OISY canister permits anonymous `update` calls and that the cycles/abuse profile
   is acceptable. Since the canister can't see IP, rate-limiting can only be
   per-token (a no-op for random-token spam, which just returns `NotFound`).
   Confirm this is acceptable or whether a lightweight global limiter is needed.
3. **Pruning mechanism.** Lazy-on-read deletion vs. a periodic `ic_cdk_timers`
   sweep vs. both. Confirm the preferred pattern in this codebase and the cleanup
   cadence.
4. **Crypto parameters.** Confirm AES-GCM-256 with a 96-bit random IV, token as
   AAD, key as raw 32 bytes base64url in the fragment — and whether to reuse the
   `@dfinity/vetkeys` `DerivedKeyMaterial` AEAD wrapper with a locally-generated key
   vs. calling WebCrypto `SubtleCrypto` directly.
5. **Token & key lengths / collision handling.** Confirm 128-bit token is enough
   and how the backend should respond to a duplicate token (reject and let the
   client retry).
6. **Domain / link shape.** Confirm the production base URL and the route path
   (`/notes/share/<token>` vs. a shorter `/s/<token>`), and that the SvelteKit
   `(public)` group + IC asset canister serve a deep link with a fragment correctly.
7. **Ciphertext bounds & active-share counting.** Confirm reuse of
   `MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES` (10,000) for `ct_content`, and the
   **mechanism to count a user's active shares** for the cap (a per-creator counter
   vs. a `(creator, token)` index), accounting for shares that expire or are consumed.
8. **Header & theme on the public route.** The recipient page should render the real
   `hero/Header.svelte` (logged-out) over the `landing_bg_*` background with light/dark.
   Confirm whether to point the `(public)/notes/share/[token]` route at the hero
   header directly, or lift the hero header + background into a shared layout the
   `(public)` group can opt into — and that theme + background work on a route loaded
   with no wallet state / no identity.

## Pending decisions (facts clear — owner must decide)

1. **Fire-and-forget confirmed.** No revocation/management surface in v1
   (decided). Re-confirm we accept that a leaked link cannot be killed before
   expiry, mitigated only by short expiries + single-use. _(If this later feels too
   risky, "revoke all shares for a note" is the smallest add-on.)_
2. **Expiry option set & default.** Proposed **1h / 24h / 7d / 30d, default 24h**.
   Confirm or adjust (e.g. add a 15-minute option, or cap at 7 days).
3. **Single-use default.** Proposed **off**. Confirm.
4. **Recipient note view = text only** (decided). The revealed **note** shows no
   timestamps, no attribution, and no CTA. The OISY acquisition CTA (**Discover
   OISY**) lives on the separate **Done → outro** state and the **unavailable**
   state, not layered onto the note itself. Re-confirm we don't want even a subtle
   "Made with OISY" footer on the note view.
5. **Reveal-to-burn** for single-use (decided). Confirm the locked → reveal
   interaction is acceptable UX for reusable links too (proposed: yes, identical
   flow for both, so the page behaves consistently).
6. **Per-user active-share cap value.** A `MAX_PERSONAL_NOTE_SHARES_PER_USER` is
   needed to prevent flooding; **proposed ~100 active shares** (well below the 1,000
   notes cap, since shares are transient and recycle as they expire). Pick the value.

## Analytics (Plausible)

Add Plausible tracking, following OISY's existing analytics patterns (e.g. the
`trackEventSource` / `LANDING_PAGE_ROUTE` usage in `hero/Header.svelte` and the
`2026-06-02-impr-track-learn-more-clicks` spec). **Event names and property keys are
left to implementation** — Claude Code can see the existing analytics code and the
Confluence analytics spec and should choose names/properties consistent with them.

Track the following interactions:

- **Share entry point clicked** — the "Share note" link is opened from the note view.
- **Share link created** — a link is generated. Include the **non-personal**
  attributes: **validity/expiry** and **single-use** (yes/no).
- **Share link used** — a recipient opens the shared-note page (the link is visited).
- **Reveal clicked** — the recipient clicks Reveal.
- **Note copied** — the recipient uses Copy note.
- **Outro shown** — the Done → outro state is reached.
- **Discover OISY clicked** — the outro (or unavailable) CTA to oisy.com is clicked.

**Privacy:** properties must never include the note text, the token,
or the share key. Recipient-side events (used / reveal / copy / outro / discover) fire
on the **logged-out public page**, so confirm they respect that surface's analytics
setup. Exact names, properties, and firing points are resolved during implementation.

## Post-Merge

Per [Step 7 — Post-merge cleanup (Claude Code)](../workflow.md), remove this spec's
`2026-06-30-feat-share-personal-note/` asset folder after the feature ships; the
`.md` stays. `PRODUCT.md` is updated in the behaviour-change PR, not here.
