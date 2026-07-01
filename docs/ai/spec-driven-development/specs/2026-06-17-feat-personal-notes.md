This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Personal notes

## Goal

Give the user a simple, standalone **personal notes** feature: a private list of
free-text notes they can add, edit, and delete from anywhere in the wallet. The
notes are:

1. **Reached from a new "Notes" user-menu item**, placed directly **after the
   "Contacts" / Address book item** in the user menu
   ([`src/frontend/src/lib/components/core/Menu.svelte`](../../../../src/frontend/src/lib/components/core/Menu.svelte)).
2. **Shown in a modal** that lists the user's notes (newest first) with view / add /
   edit / delete; tapping a note opens a read-only view where **URLs are clickable
   links**.
3. **Stored per-user in the backend canister, end-to-end encrypted** via vetKeys,
   so the canister and node providers only ever see ciphertext.

A note is **not attached to anything** — it is a free-standing personal memo. It
is the user's own private text and is never put on-chain.

## Motivation

This is the **deliberately simpler first version** of the encrypted-notes idea.
The transaction-personal-note spec (PR #13128,
`2026-06-16-feat-transaction-personal-note.md`) ties a note to a specific
transaction across all networks, which pulls in per-network id-parity, send-flow
threading, transaction-details surfaces, and network-scoped loading. That spec is
**paused in favour of this one** (see [Relationship to PR #13128](#relationship-to-pr-13128)).

Shipping standalone notes first delivers user value with a much smaller surface
**and** stands up the entire encrypted-store foundation (vetKeys `EncryptedMaps`
backend + `@dfinity/vetkeys` frontend crypto + IndexedDB key caching). A future
transaction-notes feature, if revived, can reuse that **storage/crypto foundation**
as a separate parallel store — but it would live on its own surfaces and is **not**
shown in this Notes list (see [Relationship to PR #13128](#relationship-to-pr-13128)).

---

## Background (today's code)

### The user menu (where the entry point goes)

- The user menu is [`src/frontend/src/lib/components/core/Menu.svelte`](../../../../src/frontend/src/lib/components/core/Menu.svelte)
  (a gix `Popover` anchored to the avatar button, rendered from
  [`src/frontend/src/lib/components/hero/Header.svelte`](../../../../src/frontend/src/lib/components/hero/Header.svelte)).
- The **"Contacts" item** is the **Address book** entry in that menu — a
  `ButtonMenu` with `IconUsersRound`, label `$i18n.navigation.text.address_book`,
  test id `NAVIGATION_MENU_ADDRESS_BOOK_BUTTON`, that opens its modal via
  `modalStore.openAddressBook({ id: addressModalId })`. **The new "Notes" item is
  inserted immediately after this `ButtonMenu`** (before the privacy-mode toggle).
- Items are plain `ButtonMenu`
  ([`src/frontend/src/lib/components/ui/ButtonMenu.svelte`](../../../../src/frontend/src/lib/components/ui/ButtonMenu.svelte))
  rows; menu test ids live in
  [`src/frontend/src/lib/constants/test-ids.constants.ts`](../../../../src/frontend/src/lib/constants/test-ids.constants.ts).

### The modal pattern (how the Notes modal opens)

OISY uses a central modal store, mirrored by the Address-book modal this feature
sits next to:

- Open/close actions on `modalStore` —
  [`src/frontend/src/lib/stores/modal.store.ts`](../../../../src/frontend/src/lib/stores/modal.store.ts)
  (e.g. `openAddressBook`).
- A `$modal…` derived flag —
  [`src/frontend/src/lib/derived/modal.derived.ts`](../../../../src/frontend/src/lib/derived/modal.derived.ts)
  (e.g. `modalAddressBook`).
- The modal component itself is conditionally rendered from the app's global
  modals host (the same place `AddressBookModal` is mounted — find via the
  `$modalAddressBook` usage) using gix `Modal`.
- The Address-book modal
  ([`src/frontend/src/lib/components/address-book/AddressBookModal.svelte`](../../../../src/frontend/src/lib/components/address-book/AddressBookModal.svelte))
  is the closest UI template: a list view, empty state
  ([`EmptyAddressBook.svelte`](../../../../src/frontend/src/lib/components/address-book/EmptyAddressBook.svelte)),
  and add/edit/delete steps.

### The existing per-user "user-authored metadata" pattern — Contacts

Contacts are the cleanest template for reading/writing per-principal user data
(this feature follows it, but stores **ciphertext** instead of cleartext):

- Shared types: [`src/shared/src/types/contact.rs`](../../../../src/shared/src/types/contact.rs)
  (`Contact`, `StoredContacts`, `CreateContactRequest`, `ContactError`,
  `MAX_CONTACTS_PER_USER`).
- Result enums: [`src/shared/src/types/result_types.rs`](../../../../src/shared/src/types/result_types.rs)
  (with `From<Result<…, ContactError>>` impls).
- Stable map: `ContactMap = StableBTreeMap<StoredPrincipal, Candid<StoredContacts>>`
  ([`src/backend/src/types/maps.rs`](../../../../src/backend/src/types/maps.rs)),
  `State.contact` field.
- API handlers: [`src/backend/src/api/contacts.rs`](../../../../src/backend/src/api/contacts.rs)
  (`create/update/delete_contact` are `#[update(guard = "caller_is_registered_user")]`;
  `get_contacts` is `#[query(guard = "caller_is_not_anonymous")]`).
- Service: [`src/backend/src/contacts/service.rs`](../../../../src/backend/src/contacts/service.rs).
- Frontend: API wrappers in [`src/frontend/src/lib/api/backend.api.ts`](../../../../src/frontend/src/lib/api/backend.api.ts),
  service [`src/frontend/src/lib/services/manage-contacts.service.ts`](../../../../src/frontend/src/lib/services/manage-contacts.service.ts),
  store [`src/frontend/src/lib/stores/contacts.store.ts`](../../../../src/frontend/src/lib/stores/contacts.store.ts),
  input UI [`src/frontend/src/lib/components/address-book/InputContactName.svelte`](../../../../src/frontend/src/lib/components/address-book/InputContactName.svelte)
  (wraps `InputText`, enforces `CONTACT_MAX_NAME_LENGTH`).

### Backend storage conventions

From [`docs/ai/backend/structure.md`](../../../../docs/ai/backend/structure.md) /
[`patterns.md`](../../../../docs/ai/backend/patterns.md):

- All persisted state lives in the single `STATE` cell
  ([`src/backend/src/state/mod.rs`](../../../../src/backend/src/state/mod.rs));
  read via `read_state`, write via `mutate_state`, never hold a borrow across
  `.await`.
- Collections are `ic-stable-structures` keyed by a `MemoryId`
  ([`src/backend/src/state/memory.rs`](../../../../src/backend/src/state/memory.rs)).
  **Next free `MemoryId` is `14`** (0–13 used; `5` is reserved/dead and must not
  be reused).
- Custom values become `Storable` via the `Candid<T>` wrapper
  ([`src/backend/src/types/storable.rs`](../../../../src/backend/src/types/storable.rs)).
- Candid-exposed types live in `src/shared/src/types/<area>.rs`; result enums in
  `shared::types::result_types`. After changing the API set, run
  `npm run generate` to regenerate `backend.did` (never hand-edit it).
- Per-caller write limiting uses the existing `RateLimiter`
  ([`src/backend/src/utils/rate_limiter.rs`](../../../../src/backend/src/utils/rate_limiter.rs));
  guards live in [`src/backend/src/utils/guards.rs`](../../../../src/backend/src/utils/guards.rs).

---

## Relationship to PR #13128

The transaction-personal-note spec is **paused**. This spec supersedes it for now:
it ships the simpler, standalone notes feature **and** the shared encrypted-store
foundation (backend `EncryptedMaps`, frontend vetKeys crypto + key caching).

**Transaction notes are out of scope for this list — permanently, not just for v1.**
The Notes modal shows **only** standalone personal notes; it will **not** host
transaction-linked notes. If the team later revives per-transaction notes, they live
on their **own surfaces** (the send flow / transaction-details modals) and are **not**
merged into this list. What such a feature can still reuse is this PR's **encrypted-
store foundation** (vetKeys `EncryptedMaps` + the vetKD derivation endpoints +
frontend crypto/key-caching) as a separate, parallel store keyed by `(TokenId, tx_id)`
instead of an opaque `note_id`. So this work de-risks that later effort at the
storage/crypto layer, but the two remain distinct features with distinct UIs.

---

## Decisions (resolved during clarification)

1. **Standalone notes, not attached to anything.** A note is a free-standing
   personal memo. No transaction, address, token, or network association in v1.
2. **Full CRUD from one modal.** A new "Notes" user-menu item opens a modal that
   lists the user's notes and supports **view / add / edit / delete** (tapping a note
   opens a read-only view — Decision 16 — from which Edit and Delete are reached).
   "Add" and "edit" are the same `set_personal_note` upsert (keyed by a stable
   `note_id`); the backend exposes set / get / delete (+ a count).
3. **Note model = body + timestamps.** Each note is free text plus
   `created_at_ns` / `updated_at_ns`, both **UTC epoch nanoseconds** (absolute,
   timezone-agnostic instants — matching IC time; the client sets them, see
   [Stored value](#stored-value)). **No separate title field** — a note is a single
   free-text body; there is no distinct stored title. However, the **first line is
   shown as a de-facto title** (bold) in the list preview and the read-only view
   (display convention only — nothing extra is stored). See
   [Design → List](#design) and Out of Scope 2.
   - **List row:** a note that has **never been edited** (`updated_at_ns ==
created_at_ns`) shows **"Created …"**; once edited it shows **"Updated …"**
     (Decision 7 sorts by `updated_at_ns`, so edited notes rise to the top).
   - **Edit view:** **always shows the created date** (and the updated time when the
     note has been edited).
   - **All displayed times render in the user's local timezone** (the stored value
     is UTC; formatting converts on the client). See the timestamp-format detail in
     [Design → List](#design).
4. **Length:** up to **2,000 characters** of cleartext body (~300–350 words),
   entered in a multi-line textarea. Because the backend only ever sees ciphertext,
   this cap is enforced **client-side**; the backend enforces only a max
   **ciphertext byte** bound as defense-in-depth (Decision 5). **Empty notes are not
   allowed:** a note whose body is empty or **whitespace-only** (after trimming)
   cannot be saved — Save stays disabled, so there is no way to create or save a
   blank note (and the backend never receives one). Trim leading/trailing
   whitespace before measuring length and before storing.
5. **Encryption: client-side via vetKeys.** Notes are encrypted in the browser
   before they leave the device and decrypted in the browser on read; the canister
   and subnet nodes only ever see **ciphertext**. A **per-user** symmetric key is
   derived via vetKD (one key per principal — no per-note key, since notes are not
   shared). Concretely the store is a per-user encrypted key-value map (vetKeys
   `EncryptedMaps`).
6. **New dependencies approved by the PM** (per CLAUDE.md): `ic-vetkeys` (Cargo,
   backend) and `@dfinity/vetkeys` (npm, frontend). (Same deps the paused
   transaction-note spec approved — this feature lands them first.)
7. **Sort newest-first** by `updated_at_ns` descending in the list. Editing a note
   bumps it to the top (its `updated_at_ns` is refreshed).
8. **Per-user cap = `MAX_PERSONAL_NOTES_PER_USER = 1,000`; reject at capacity,
   never evict.** At the cap a **new** note is refused with `TooManyNotes`; editing
   or deleting existing notes still works. Mirrors `MAX_CONTACTS_PER_USER`.
   Worst-case storage at the cap (1,000 notes × 2,000 chars) is ~2 MB/user (ASCII)
   to ~8 MB/user (CJK-dense), well within budget.
9. **Delete is idempotent** — `delete_personal_note` on a missing note returns
   `Ok`, not an error.
10. **`get` returns all of the caller's notes in one call** (ciphertext entries),
    decrypted client-side. Notes are not network-scoped, so there is a single
    namespace; the per-user cap bounds the worst case. (Whether to paginate near
    the cap is an [open question](#open-questions-facts-to-confirm); for typical
    note counts a single fetch is cheap.)
11. **Guards + rate limiting on writes.** `set` / `delete` are
    `#[update(guard = "caller_is_registered_user")]`; `get` / count are
    `#[query(guard = "caller_is_not_anonymous")]` — same as contacts. Writes are
    per-caller rate-limited via the existing `RateLimiter` at **30/min per caller**
    (generous: `set` covers both add and edit). Reads are unlimited.
12. **The frontend disables new-note creation when at the cap**, with a clear
    explanation; editing and deleting stay enabled. Driven by a cheap count query
    (`get_personal_notes_count`); the backend `TooManyNotes` rejection remains the
    source of truth.
13. **Notes are loaded lazily on first open of the Notes modal — not on wallet
    init.** Because the feature is entirely self-contained in one modal (no other
    surface reads notes, unlike the transaction-note feature), nothing needs to load
    until the user opens it. On the **first** open, the modal triggers
    `loadPersonalNotes()` (which lazily derives/caches the per-user vetKey on first
    use, then fetches + decrypts the entries) and `getPersonalNotesCount()`; a
    loading state shows meanwhile. The decrypted notes and count are **cached in the
    store for the session**, so re-opening the modal is instant (no re-fetch, no
    re-derive) — writes update the cache optimistically. This avoids paying the
    vetKey-derivation and fetch/decrypt cost for users who never open Notes, and
    keeps wallet startup unaffected.
14. **Any language / character set is supported.** A note is arbitrary Unicode —
    any script (Latin, Cyrillic, CJK, Arabic/Hebrew RTL, Indic, …), emoji, combining
    marks, and mixed-direction text — stored and transmitted as **UTF-8** (inside the
    encrypted envelope). The **2,000-char cap is counted in Unicode code points**
    (e.g. `[...str].length` / `Array.from(str).length`), **not** JavaScript's
    UTF-16 `String.length`, so emoji and astral-plane / CJK characters are counted
    fairly and consistently with what the user sees. The backend's separate
    ciphertext-**byte** bound (Decision 4) is sized for the worst-case multi-byte
    expansion. No normalization is imposed on the user's text beyond what is needed
    for safe display (Decision 15).
15. **The note body is untrusted input and must not become an attack vector.** It is
    free user text that is rendered back into the DOM, so it is a classic stored-XSS
    surface — and because the backend only ever sees **ciphertext**, the backend
    cannot sanitize it, making **safe client-side rendering the control**. The note
    is therefore **always rendered as plain text**: use Svelte's default
    text-interpolation auto-escaping ({`text`}), **never `{@html}`**, with line
    breaks handled by **CSS** (not by injecting `<br>` or any markup) — in the
    **full/edit view** preserve them with `white-space: pre-wrap`, while the
    **list-row preview** shows the first line as a one-line title and the rest
    collapsed to a single line (see [Design → List](#design)). The plain-text +
    escaping rule applies anywhere a note is shown (list rows, view, edit field,
    search results, toasts). Additionally: treat
    **Unicode bidi / control
    characters** (e.g. U+202A–202E, U+2066–2069, other Cf/control code points) as a
    spoofing risk — isolate or strip them on display so a note cannot reorder or
    impersonate surrounding UI; **do not log** note cleartext; and **never** place
    note text into a URL, HTML attribute, or `innerHTML` without proper encoding.
    No HTML or Markdown is rendered. **The one exception is URL auto-linking**
    (Decision 16): `http`/`https` URLs in the read-only view become clickable links —
    done by a **safe linkifier** that still escapes everything and only ever emits
    anchors with a vetted scheme (never `{@html}` of raw input).
16. **A read-only view mode, with clickable links.** Because notes are free text,
    there is no proper place to show a note's **full** content with **clickable
    URLs**: the list row is a truncated preview, and the editor is a plain `<textarea>`
    (which can't render clickable links). So tapping a note opens a **read-only view**
    (its own step, like Contacts' contact detail): the full note, line breaks
    preserved, with `http`/`https` URLs rendered as **links that open in a new tab**,
    plus **Edit** and **Delete**. Linking is done safely (Decision 15): escape all
    text first, auto-link **only** `http`/`https` matches (never `javascript:` /
    `data:` / others), build the `<a>` from escaped strings (no `{@html}` of raw
    input), and open with `target="_blank" rel="noopener noreferrer"`. URLs are shown
    as **plain text in the editor** (a textarea can't be rich) — only the view
    linkifies. Navigation and button hierarchy are in [Design](#design).

---

## Design

A single interactive HTML wireframe accompanies this spec, styled to the **current
OISY Contacts modal** (the surface this feature sits next to):

- [Notes modal](./2026-06-17-feat-personal-notes/wireframes/notes-modal.html) — opens
  on the **user menu** (with the new **"Notes"** item directly under "Contacts");
  clicking it opens the Notes modal, and **X / Close / clicking the dimmed backdrop**
  close it (returning to the menu), while the **editor step has no X and ignores
  backdrop clicks**. Also covers the list, empty state, the **read-only view**
  (tap a row → full note with **clickable links**; "Load test notes" includes a
  note with URLs), and the add/edit form. Like the
  transaction-note wireframes it has a **Desktop / Mobile toggle** and a **"Simulate:
  at note cap"** switch (disables "Add note" + shows the cap banner while edit/delete
  stay enabled). On desktop the modal is a centered floating card with the add/edit
  form as a step inside it; on **mobile the modal renders full-page** (matching the
  current Contacts modal), and the add/edit editor is a **full-page step** within it.

### Entry point

In [`src/frontend/src/lib/components/core/Menu.svelte`](../../../../src/frontend/src/lib/components/core/Menu.svelte),
add a `ButtonMenu` **immediately after the Address-book button** and before the
privacy-mode toggle:

- Label: `$i18n.navigation.text.notes` ("Notes").
- Icon: a lucide note/file icon from `$lib/components/icons/lucide/` (e.g.
  `IconStickyNote` / `IconNotebook` — reuse if present, otherwise add the icon
  component following the existing lucide-icon pattern).
- `onclick={() => modalStore.openNotes({ id: notesModalId })}` with a local
  `const notesModalId = Symbol();` (mirrors `addressModalId`).
- Test id `NAVIGATION_MENU_NOTES_BUTTON` in
  [`test-ids.constants.ts`](../../../../src/frontend/src/lib/constants/test-ids.constants.ts).
- Gated by `$authSignedIn` (it sits inside the signed-in block, like Address book).

### Notes modal

A new `NotesModal.svelte` (new folder
`src/frontend/src/lib/components/notes/`), opened via `$modalNotes`, using gix
`Modal` like `AddressBookModal`. States:

- **Empty:** a friendly empty state (mirror
  [`EmptyAddressBook.svelte`](../../../../src/frontend/src/lib/components/address-book/EmptyAddressBook.svelte))
  composed as **one balanced, vertically-centered group** with even spacing: a small
  neutral-grey icon tile, the heading **"Your notes are empty"**, a one-line subtitle
  (**"Create a private, encrypted note to keep details safe alongside your wallet."**),
  the primary **"Add new note"** button, and below it the **"OISY protects you!"
  privacy info box** — so a first-time user sees that notes are private and encrypted
  **before** creating one. (Grouping all four with symmetric whitespace, rather than
  centering the illustration and pinning the box to the bottom, keeps it calm.)
- **List:** notes newest-first (Decision 7). Each row (`NoteListItem.svelte`) is
  **tap-to-open** — tapping it opens the read-only **View** (below). The row shows a
  **two-line text preview** and a relative timestamp on the left, and a **chevron**
  affordance on the right; there are **no inline edit/delete icons** (edit and delete
  live in the View). Above the list sits a toolbar with a **"Search note" field** and
  the **"Add note"** button (the screen's **primary, filled action**, disabled at the
  cap — Decision 12). **No per-row icon:** notes have no per-item identity to show, so
  the row is text-only, giving the preview the full row width. (Contacts warrant an
  avatar because each contact has a distinct identity; notes do not.)
- **Search (client-side, in v1):** the **"Search note"** field filters the **already
  loaded + decrypted** notes in memory by a case-insensitive **substring match over
  the full note text** — no backend call (the backend only holds ciphertext, so
  server-side search is impossible; Out of Scope 3). The field's trailing affordance
  is a **magnifier when empty** and a **clear ✕ when it has content** (matching the
  contact-search input); clearing restores the full list. A no-match query shows a
  simple "No notes match your search." message.
  **Preview rendering (precise) — first line is the note's "title":**
  - **Line 1 = the note's first line, shown as a bold title** (same size/weight as a
    contact name), on **one line** with a trailing **ellipsis** if too long.
  - **Line 2 = the remaining lines**, with **line breaks and whitespace runs collapsed
    to single spaces**, shown **lighter** (smaller, regular weight, secondary color),
    also **one line + ellipsis**. Omitted entirely when the note is a single line.
  - Split on the **first** newline: text before it is the title; everything after,
    whitespace-collapsed, is the second line. (If the note starts with blank lines,
    fall back to the first non-empty content as the title.) Example — a note
    `"This is my first line\nand\nhere\nsome more about this"` previews as title
    "This is my first lin…" and second line "and here some more…".
  - This collapsing is the **list preview only** — the full note keeps its line breaks
    in the edit field / full view (per Decision 15).
  - Escaping/safety still applies (Decision 15): both lines are auto-escaped plain
    text with bidi/control characters neutralized; collapsing whitespace is a display
    choice and does not bypass escaping.
  - **Timestamp** uses the **"Created …" vs "Updated …"** rule (Decision 3): show
    `created_at_ns` prefixed "Created" when the note was never edited, otherwise
    `updated_at_ns` prefixed "Updated". Format with OISY's existing relative/date
    helpers, **always in the user's local timezone** (stored value is UTC epoch-ns):
    relative for recent times ("just now", "N minutes ago", "N hours ago",
    "yesterday", "N days ago") and an **absolute date** for older ones — **month +
    day for the current year (e.g. "Jun 3"), month + day + year only when the year
    differs (e.g. "Mar 12, 2025")**. Reuse the existing OISY date/relative-time
    utilities rather than rolling a new formatter.
  - The **edit view always shows the created date** (local time): **"Created {date}"**
    for a never-edited note, and **"Created {date} · Updated {date}"** once it has been
    edited (the `·` separator joins the two).
- **View (read-only — Decision 16):** tapping a list row opens the note's **full
  content** as its own step. The note text sits in a **bordered box** (a thin border
  with a **minimum height of ~4 rows**) so the note area is clearly delineated — read
  as a read-only field. Inside the box, the **first line is a bold title** (matching
  the list) and the remaining lines are the body, with **line breaks preserved**
  (`white-space: pre-wrap`) and **`http`/`https` URLs rendered as clickable links that
  open in a new tab** (safe linkifier — Decision 15). **For long notes the box itself
  scrolls** (its own scrollbar), while the **created/updated line and the Edit/Delete
  actions stay pinned below it**. The created/updated line reads "Created {date}" /
  "Created {date} · Updated {date}". Actions: **Edit** (secondary) and **Delete**. The
  **footer button is the primary action**, always labelled **"Back"** (whether the
  View was opened from the list or reached by returning from the editor), and returns
  to the list. The header **(X)**
  closes the whole modal (read-only, so
  there is no unsaved-data risk).
- **Add / edit:** the body switches to (or a sub-step opens) an
  `InputPersonalNote` multi-line textarea, with **Cancel / Save**. **Save is
  disabled** while the trimmed content is **empty, too long, or unchanged since the
  editor opened** — so a no-op edit (reopening a note and saving without changes)
  cannot create a redundant write or bump `updated_at_ns`. The same form and the
  same `savePersonalNote` upsert serve both add and edit. **Layout order inside the
  form:**
  1. "Note" label + textarea (validation error appears directly under it). The
     textarea has a **~4-row minimum** (matching the view note-box) and **fills the
     available modal height**, so the editor opens at the same height as the View it
     came from; for long notes the **textarea scrolls internally** while the
     metadata, Delete, privacy box and footer stay pinned.
  2. **Created/updated line directly below the textarea** ("Created {date}" /
     "Created {date} · Updated {date}"), so the metadata sits close to the text it
     describes.
  3. **Delete** action (when editing an existing note).
  4. **A separate "OISY protects you!" privacy info box** _after_ the Note panel
     (its own box, shield icon + bold lead + body + "Learn more" — see
     [UI copy](#ui-copy-i18n)) — not inline helper text.

  **After Save / Cancel (navigation):** a **new** note returns to the **list** on
  **both Save and Cancel** (it never enters the View). **Editing an existing** note
  returns to that note's **View** on **both Save and Cancel**. **Delete** (from the
  editor's Delete or the View's Delete) first asks for **confirmation** (below); on
  confirm the note is deleted and the modal returns to the **list**, on cancel it
  stays where it was.

  **Focus on open:** the textarea is **auto-focused** the moment the editor opens so
  the user can type immediately — **add** opens empty with the caret ready; **edit**
  places the caret at the **end** of the existing text. (Use a non-scrolling focus,
  e.g. `focus({ preventScroll: true })`, so focusing never yanks the surrounding
  modal/list.)

- **Loading:** while notes are being fetched/decrypted, show a small skeleton — no
  flash of the empty state.
- **Failed to decrypt:** if a single note can't be decrypted, that row shows
  "Couldn't decrypt this note" + a **Retry** action; the entry is left intact and
  other notes are unaffected (per-note isolation).

**Dismissal rules (differ by state):**

- **List / empty state:** shows the header **(X)** and is **dismissible** — the (X),
  the "Close" button, and a **backdrop/outside click** all close the whole Notes
  modal (standard modal behavior).
- **View step (read-only):** shows the **(X)**; the (X) and a **backdrop/outside
  click** close the whole modal, while the footer **Back/OK** returns to the list.
  There is no unsaved data to protect.
- **Add / edit step:** **no (X)** in the header, and a **backdrop/outside click does
  nothing** — the only ways out are **Cancel** (discard) or **Save**. This prevents
  an accidental tap from silently dropping unsaved text. (Escape may map to Cancel.)
  Because Save is disabled while unchanged, cancelling an unchanged editor and
  closing are equivalent no-ops; the protection matters when the field is dirty.

On mobile the modal renders **full-page** (full viewport, square corners, header
flush at top, "Close" pinned at the bottom) — matching how `AddressBookModal`
presents on mobile. The list/empty page is the full-page modal, and the **add/edit
editor is a full-page step** within it (push/replace navigation within the modal,
like Contacts' "Add new contact"), **not a bottom sheet**. On desktop the modal is a
centered floating card and the add/edit form is a step inside that card. The same
full-page-step pattern is used for both, so there is a single editor layout.

**Modal sizing & scroll (Notes leads this).** On **desktop** the card grows with its
content from a comfortable **minimum height** up to **~80% of the viewport height**,
and only then does the **list scroll inside its own region** — the search header and
the pinned footer stay put, and the scrollbar is confined to the list (it does **not**
run the full height of the modal). The card never reaches the screen edges (it keeps a
margin all round). On **mobile** the modal stays **full-page** (the global modal
default), with the list scrolling between the flush header and the bottom-pinned
"Close". Note: OISY's shared modal currently does **not** cap desktop height or confine
the scroll (a long dialog grows to the viewport edges and the whole body scrolls);
Notes deliberately **pioneers** the capped, content-scrolled behaviour here (via the
modal's `--dialog-max-height` and a dedicated list scroll region), so the shared modal
component can be aligned to it later.

**Desktop modal sizing.** The desktop modal **sizes to its content** rather than a
fixed height, with:

- a **minimum height of ~560px** (≈ the empty-state height) so short notes/lists
  aren't squat, and
- a **maximum of ~75% of the viewport height (`75vh`)**;

beyond the max, the relevant region **scrolls internally** (the list, the editor, or
the view's note box) while the header and footer stay pinned. **Both bounds are
clamped to the available space** (`min(560px, 100%)` / `min(75vh, 100%)`), so on short
windows the window height wins and the modal never exceeds it (no page scroll). On
**mobile** the modal is full-page (fills the screen) and these desktop bounds do not
apply.

**Padding / spacing.** Reuse OISY's **existing modal padding and spacing tokens** (the
same the Address-book modal uses) for the header, body, footer, and the gap between
elements — this spec introduces **no new spacing values**; the only sizing constants
it adds are the modal min/max above and the view note-box / editor textarea min
height (~4 rows).

**List scroll detail.** When the list scrolls (more notes than fit), the **search +
"Add note" toolbar scrolls with the rows** (it is part of the scrollable body); only
the header and the "Close" footer stay pinned. (If product later prefers a sticky
search bar, that is a small, additive change — out of scope here.)

**Why a full-page step, not a bottom sheet (text entry + keyboard).** The editor
auto-focuses (above), so the soft keyboard appears immediately. Apple's HIG supports
text entry in sheets, but only comfortably at a **large / near-full-height** detent —
a short bottom sheet plus the keyboard is the combination to avoid (on an iPhone 15
the ~336pt keyboard would cover the buttons, the info box, and most of the textarea).
iOS's native sheets auto-resize for the keyboard; a web app's `BottomSheet` does not,
so it would need fragile `visualViewport` math, and it also adds a second stacked
modal layer over the already-full-page Notes modal (the HIG discourages deep modal
stacking). A **full-page editor avoids all of this**: the field sits near the top and
stays visible while typing, and the canvas above the keyboard is maximized.
Requirements for the full-page editor on mobile:

- The **textarea sits high** (just under the header) so it is always visible above
  the keyboard.
- **Cancel / Save remain reachable while the keyboard is open** — place them so they
  are not hidden behind the keyboard (e.g. header actions, or a footer that the page
  can scroll to); do **not** rely on a footer fixed behind the keyboard. (A multiline
  textarea has no iOS "Done" key, so the actions must be reachable without dismissing
  the keyboard.)
- The editor content is **scrollable** so it works on short screens (e.g. iPhone SE).
- **Bottom sheets remain the right tool elsewhere** (keyboard-less interactions like
  confirmations/pickers); they are just not used for this text editor.

### Input component

New `InputPersonalNote.svelte` in `src/frontend/src/lib/components/notes/`,
modeled on
[`InputContactName.svelte`](../../../../src/frontend/src/lib/components/address-book/InputContactName.svelte)
but multi-line (textarea). **Length feedback matches `InputContactName` — no live
character counter.** Show a "too long" error only once the value exceeds
`MAX_PERSONAL_NOTE_LENGTH` (a `$maxCharacters`-placeholder i18n string, revealed
with a `slide` transition, in the error color) and block Save while too long.

### Key model & stored value

With `EncryptedMaps`, each user has their own map; entries are keyed by an opaque,
**client-generated** note id:

```
owner   = StoredPrincipal          // the caller — selects the user's map
mapKey  = note_id (String)         // client-generated, stable per note (e.g. UUIDv4 / ULID)
value   = encrypted(note envelope) // ciphertext; canister never sees cleartext
```

- `note_id` is generated on the client when a note is first created and never
  changes (edits reuse it). Using an opaque random id (vs. encoding any content)
  means the unencrypted map key leaks nothing about the note. (ULID vs. UUIDv4 is
  an [open question](#open-questions-facts-to-confirm) — a ULID would let the
  backend range-scan in creation order, but newest-first sort is by
  `updated_at_ns` which lives inside the ciphertext, so client-side sort is
  required regardless.)
- The cleartext envelope encrypted in the browser:

```
// cleartext, encrypted in the browser before storage:
{ note: String, created_at_ns: u64, updated_at_ns: u64 }
```

- `MAX_PERSONAL_NOTE_LENGTH = 2_000` — cleartext characters, enforced **client-side**.
  The backend additionally rejects any value above a fixed **max ciphertext byte**
  bound (`NoteCiphertextTooLarge`) as defense-in-depth.
- `created_at_ns` / `updated_at_ns` are **UTC epoch nanoseconds** — absolute,
  timezone-agnostic instants (no offset stored). The client sets them
  (`Date.now() * 1e6`, or the IC time on read paths); **display always converts to
  the user's local timezone** via OISY's date utilities. A new note sets both to the
  same value (so it reads as "Created …" until first edited); an edit refreshes only
  `updated_at_ns`.
- Timestamps live inside the encrypted envelope (the client sets them); a
  server-attested time is an [open question](#open-questions-facts-to-confirm).

### UI copy (i18n)

Strings live under `navigation.text.notes` (menu) and a new `notes.*` block:

- **Menu item:** "Notes".
- **Modal title:** "Notes".
- **Empty state:** heading **"Your notes are empty"** + subtitle **"Create a private,
  encrypted note to keep details safe alongside your wallet."** + **"Add new note"**
  button.
- **Add/edit field label:** "Note"; **placeholder:** a content hint, e.g.
  "Write a note…".
- **Privacy info box** (a separate **neutral-grey** box, reusing OISY's existing
  shield "OISY protects you!" info-box pattern — e.g. the Recent-Activity small-value
  notice): green shield + bold lead **"OISY protects you!"** + body **"Only you can
  see your notes, stored encrypted in OISY."** + a **"Learn more"** link. Shown on the
  empty state and in the editor (consistent style), **not** inline helper text under
  the field.
- **Timestamps:** list row "Created {$date}" / "Updated {$date}"; edit view
  "Created {$date}" or "Created {$created} · Updated {$updated}" (the `·` joins
  them). `{$date}` is the localized relative/absolute time.
- **Buttons:** reuse core "Cancel" / "Save" / "Add note"; **"Delete note"** action
  (red text + trash, mirroring Contacts' "Delete contact").
- **View mode:** footer button **"Back"**; **"Edit note"** (secondary) and
  **"Delete note"** actions.
- **Too-long error:** "Note must be {$maxCharacters} characters or fewer."
- **Cap reached:** "You've reached the maximum of {$max} saved notes. Delete one
  to add a new note."
- **Delete confirmation:** title "Delete note"; body "This will delete the note
  '$note'. This action cannot be undone." where `$note` is a short snippet (the
  first ~15 characters of the note, rendered **bold**); buttons "Cancel" / "Delete
  note". Mirrors the contact-delete confirmation's wording.
- **Decryption failure:** "Couldn't decrypt this note" + a "Retry" action.
- **Search:** placeholder **"Search note"**; no-match message **"No notes match your
  search."**

---

## Implementation

Delivered as **atomic PRs across waves** — see
[Delivery plan](#delivery-plan-atomic-prs--waves). Each PR is independently
mergeable with its own tests.

### PR-1 (backend) — Encrypted storage (vetKeys `EncryptedMaps`) + API

**Dependency (approved, Decision 6):** add `ic-vetkeys` to the backend
`Cargo.toml` and use its `EncryptedMaps` (which wraps the `vetkd` system API).

**Shared / candid types** — new module
`src/shared/src/types/personal_note.rs`. The value crossing the candid boundary is
**already-encrypted ciphertext**:

- `SetPersonalNoteRequest { note_id: String, encrypted_note: Vec<u8> }`.
- `DeletePersonalNoteRequest { note_id: String }`.
- `PersonalNoteEntry { note_id: String, encrypted_note: Vec<u8> }` — the shape
  returned by `get`.
- `PersonalNoteError` enum (e.g. `NoteCiphertextTooLarge`, `TooManyNotes`,
  `RateLimited(RateLimitError)` reusing the shared
  [`signer::RateLimitError`](../../../../src/shared/src/types/signer.rs),
  `UserNotFound`) following `ContactError`. **No `NotFound`** — delete is
  idempotent (Decision 9).
- `const MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES: usize` — generous bound for 2,000
  cleartext chars (worst-case ~3 bytes/char UTF-8) + JSON envelope + AEAD overhead;
  size it around **~10 KB**.
- `const MAX_PERSONAL_NOTES_PER_USER: usize = 1_000;` (Decision 8).

**Result enums** — in [`src/shared/src/types/result_types.rs`](../../../../src/shared/src/types/result_types.rs):
`SetPersonalNoteResult`, `GetPersonalNotesResult`, `GetPersonalNotesCountResult`,
`DeletePersonalNoteResult`, each with `From<Result<…, PersonalNoteError>>`,
mirroring the contacts result enums. (If `EncryptedMaps` exposes its own
result/error types, wrap rather than leak them so the candid surface stays ours.)

**Storage (`EncryptedMaps`)** — no custom `StableBTreeMap` / `Candid<T>` value
type; the library owns value storage and encryption:

- Add an `EncryptedMaps` instance as a field on `State`
  ([`src/backend/src/state/mod.rs`](../../../../src/backend/src/state/mod.rs)),
  initialise it in `STATE`, and add a count to the `From<&State> for Stats` impl.
- Allocate the `MemoryId`(s) the library needs in
  [`src/backend/src/state/memory.rs`](../../../../src/backend/src/state/memory.rs),
  starting at `MemoryId::new(14)`. `EncryptedMaps` may require **more than one**
  memory region — allocate the next contiguous ids and document each (confirm the
  exact count — see [Open questions](#open-questions-facts-to-confirm)).
- The `EncryptedMaps` **owner** is the caller principal (per-user isolation); the
  per-entry map-key is the `note_id` bytes.

**vetKey derivation endpoint(s)** — expose what the frontend needs to derive its
per-user symmetric key, typically a per-caller encrypted-vetkey `#[update]` and a
public-key `#[query]` (exact names/shapes per `ic-vetkeys` — confirm). Guard the
per-caller derivation with `caller_is_registered_user`.

**Domain module** `src/backend/src/personal_notes/` (`mod.rs` + `service.rs`),
following `contacts/`:

- `set_personal_note` — bound-check `encrypted_note` bytes (`> MAX_…_CIPHERTEXT_BYTES`
  → `NoteCiphertextTooLarge`); on a **new** `note_id` when the caller is already at
  `MAX_PERSONAL_NOTES_PER_USER`, reject with `TooManyNotes` (never evict; an edit
  to an existing key is always allowed). Otherwise upsert into the caller's
  encrypted map.
- `get_personal_notes` — return **all** of the caller's entries (Decision 10).
- `delete_personal_note` — remove the entry; **idempotent** (Decision 9). Assert
  the missing-key case in a test.
- `get_personal_notes_count` — return the caller's total note count (no
  decryption, no value fetch). Drives the client cap gate (Decision 12).

**API handlers** — `src/backend/src/api/personal_notes.rs`:

- `set_personal_note(SetPersonalNoteRequest) -> SetPersonalNoteResult` —
  `#[update(guard = "caller_is_registered_user")]`.
- `delete_personal_note(DeletePersonalNoteRequest) -> DeletePersonalNoteResult` —
  `#[update(guard = "caller_is_registered_user")]`.
- `get_personal_notes() -> GetPersonalNotesResult` —
  `#[query(guard = "caller_is_not_anonymous")]`.
- `get_personal_notes_count() -> GetPersonalNotesCountResult` (a `u64`) —
  `#[query(guard = "caller_is_not_anonymous")]`.
- the vetKey derivation endpoint(s) above.

**Rate limiting (Decision 11):** add `SET_PERSONAL_NOTE_RATE_LIMITER` and
`DELETE_PERSONAL_NOTE_RATE_LIMITER` to
[`rate_limiter.rs`](../../../../src/backend/src/utils/rate_limiter.rs) (both
`RateLimiter::new(30, 60 * 1_000_000_000)` → 30/min/caller). At the top of each
write handler call `LIMITER.with(rate_limiter::RateLimiter::check_caller)?` and map
a breach to `…Err(PersonalNoteError::RateLimited(e))`, exactly as `bitcoin.rs` /
`onramper.rs` do. Reads are not limited.

Wire the handlers so `export_candid!()` in
[`src/backend/src/lib.rs`](../../../../src/backend/src/lib.rs) picks them up, then
`npm run generate` to regenerate `backend.did`.

Tests: unit tests (ciphertext-byte bound, idempotent delete) plus integration
`src/backend/tests/it/personal_notes.rs` (registered in `tests/it/main.rs`)
covering anonymous rejection, set→get, edit→get, delete→get, the ciphertext bound,
the per-user cap (`TooManyNotes` on a new note at the cap, edit still allowed), the
count endpoint, and the **rate limiter** — modeled on
[`tests/it/transactions.rs`](../../../../src/backend/tests/it/transactions.rs) and
`tests/it/contacts.rs`. The vetKey/`EncryptedMaps` flows need a **vetKD test key** in the
pocket-ic setup — follow the `ic-vetkeys` testing guidance and extend
[`tests/it/utils/pocketic.rs`](../../../../src/backend/tests/it/utils/pocketic.rs)
if needed (confirm — see [Open questions](#open-questions-facts-to-confirm)).

Backend gates: `./scripts/format.sh && ./scripts/lint.rust.sh && ./scripts/lint.did.sh && ./scripts/test.backend.sh`.

### PR-2 (frontend) — vetKeys crypto + API + service + store

**Dependency (approved, Decision 6):** add `@dfinity/vetkeys` to `package.json`.

- **Crypto helper** `src/frontend/src/lib/services/personal-notes.vetkeys.ts`:
  derive the **per-user** symmetric key via `@dfinity/vetkeys` (fetch the encrypted
  vetKey from the backend endpoint, decrypt with a transport key, derive the AES
  key), and **cache it as a non-extractable `CryptoKey` in IndexedDB** so it is
  fetched only once per device (the pattern from DFINITY's encrypted-notes sample).
  Expose `encryptNote(envelope) -> bytes` and `decryptNote(bytes) -> envelope`.
- **API wrappers** in [`backend.api.ts`](../../../../src/frontend/src/lib/api/backend.api.ts):
  `setPersonalNote`, `getPersonalNotes`, `getPersonalNotesCount`,
  `deletePersonalNote`, plus the vetKey-derivation call (mirror the contacts
  wrappers). These move **ciphertext** only.
- **Service** `src/frontend/src/lib/services/personal-notes.services.ts` (modeled
  on [`manage-contacts.service.ts`](../../../../src/frontend/src/lib/services/manage-contacts.service.ts)):
  `loadPersonalNotes()` (fetch entries → `decryptNote` each), `savePersonalNote`
  (build/refresh the envelope → `encryptNote` → send, generating a `note_id` for
  new notes), `deletePersonalNote`, with `toastsError` handling. Decryption
  failures are surfaced per-note (one bad entry must not blank the whole list).
- **Store** `src/frontend/src/lib/stores/personal-notes.store.ts` — **decrypted**
  notes (cleartext **in memory only**), indexed by `note_id`, with a derived
  newest-first list (sort by `updated_at_ns` desc). Tracks the **total count**
  (from `getPersonalNotesCount`) and exposes a derived `atNotesCapacity`
  (`count >= MAX_PERSONAL_NOTES_PER_USER`); refresh the count after every add and
  delete. Also tracks a **`loaded` flag** so the modal loads once per session
  (Decision 13) and re-opens read from cache.
- **Lazy loading (Decision 13).** `loadPersonalNotes()` is **not** called on wallet
  init; the Notes modal calls it on open **only if `!loaded`** (then sets `loaded`).
  The first call lazily derives + caches the per-user vetKey (IndexedDB) before
  fetching/decrypting; subsequent opens are served from the store. The vetKey is
  also derived lazily on the first `savePersonalNote` if the user adds before any
  load completes.
- Add `MAX_PERSONAL_NOTE_LENGTH = 2_000` to
  [`app.constants.ts`](../../../../src/frontend/src/lib/constants/app.constants.ts)
  (cleartext cap, enforced here). **Count Unicode code points**, not UTF-16 units
  (Decision 14) — e.g. `[...value].length` — so emoji / CJK / astral characters are
  measured as the user sees them.
- Generate `note_id` with a small shared helper (e.g. `crypto.randomUUID()` /
  ULID — see [Open questions](#open-questions-facts-to-confirm)).

Tests: crypto helper round-trip (`encrypt`→`decrypt`) with a mocked vetKey,
service mappers + store sort, decryption-failure isolation, following existing
`*.services.spec.ts` conventions.

### PR-3 (frontend) — Notes menu item + modal (list / view / add / edit / delete)

- **Menu item** in [`Menu.svelte`](../../../../src/frontend/src/lib/components/core/Menu.svelte)
  right after the Address-book `ButtonMenu` (see [Entry point](#entry-point)), with
  `modalStore.openNotes(...)`, a `$modalNotes` derived in
  [`modal.derived.ts`](../../../../src/frontend/src/lib/derived/modal.derived.ts),
  an `openNotes`/`close` pair in
  [`modal.store.ts`](../../../../src/frontend/src/lib/stores/modal.store.ts), and
  the test id in [`test-ids.constants.ts`](../../../../src/frontend/src/lib/constants/test-ids.constants.ts).
- **Modal + components** in new folder `src/frontend/src/lib/components/notes/`:
  `NotesModal.svelte` (list / empty / view / add-edit states), `NoteListItem.svelte`
  (tap-to-open row, chevron, no inline icons), `NoteView.svelte` (read-only view with
  clickable links + Edit/Delete), `InputPersonalNote.svelte`, and a small **safe
  linkify helper** (or `NoteText` component) for URL auto-linking (Decisions 15–16).
  Mount `NotesModal` from the global modals host where `AddressBookModal` is mounted,
  gated on `$modalNotes`.
- **Lazy load on open (Decision 13).** On mount/open, `NotesModal` calls
  `loadPersonalNotes()` + `getPersonalNotesCount()` **only if the store is not
  already `loaded`**, showing the loading state until the notes resolve; re-opens
  render instantly from the cached store. Do **not** load on wallet init.
- **Safe rendering (Decisions 14–15).** Render note text **as plain text only** —
  rely on Svelte's default `{text}` auto-escaping, **never `{@html}`** — with line
  breaks handled by CSS, never injected markup. **List-row preview:** **line 1 = the
  note's first line as a bold title** (one line, `text-overflow: ellipsis`); **line 2
  = the remaining lines, whitespace-collapsed to single spaces**, lighter (one line,
  ellipsis), omitted for single-line notes (`overflow-wrap: anywhere`). **Edit field /
  full view:** preserve line breaks with `white-space: pre-wrap`. Apply
  bidi/control-character
  isolation on display everywhere (Decision 15). The textarea accepts any Unicode and
  the editor counts by code points (Decision 14).
- **Read-only view + clickable links (Decisions 15–16).** Tapping a row opens
  `NoteView`: the note in a **bordered box** (min ~4 rows) with the **first line as a
  bold title** and the rest as body, `white-space: pre-wrap`, and `http`/`https` URLs
  turned into `target="_blank" rel="noopener noreferrer"` links. For long notes the
  **box scrolls internally** while the created/updated line and Edit/Delete stay
  pinned below it (use a flex column, not percentage heights, so it works with the
  content-sized/`max-height`-capped modal). Implement linking by
  **splitting the text into text / URL segments and rendering anchors as real Svelte
  elements** — escape every segment, build the `href` only from `http`/`https`
  matches (never `javascript:` / `data:`), and **never `{@html}` raw input**. Footer
  button is **primary**, always reading **"Back"**; **Edit is secondary**, **Delete**
  is the danger action. Navigation:
  row tap → view; view Edit → editor; **existing-note Save/Cancel → its view;
  new-note Save/Cancel → list; Delete → list**.
- **Client-side search.** A "Search note" field filters the store's decrypted notes
  by case-insensitive substring over the full text (a derived/filtered list — no
  backend call); the trailing icon toggles magnifier ↔ clear ✕; empty result shows
  the no-match message. (Mirror the address-book search input's behaviour.)
- Wire add/edit → `savePersonalNote`, delete → `deletePersonalNote`. **Delete
  requires a confirmation step — the same pattern as deleting a contact** (there is
  **no** undo): clicking Delete (in the View or the editor) opens a confirmation
  asking **"Delete note"** with the body **"This will delete the note '<snippet>'.
  This action cannot be undone."** (the snippet is the note's first ~15 characters,
  rendered **bold** as escaped plain text — never `{@html}`, per Decision 15) and
  **Cancel / Delete note** buttons. On **desktop** the confirmation replaces the
  modal content (like Contacts' delete-contact step); on **mobile** it is a
  **bottom sheet** (reuse `BottomSheetConfirmationPopup`, like
  `DeleteContactConfirmBottomSheet`), with left/right padding on the sheet content.
  Confirming deletes the note and returns to the list; cancelling dismisses the
  confirmation and leaves the note untouched. Build it from a shared
  `DeleteNoteConfirmContent` used by both the desktop step and the bottom sheet,
  switched with `Responsive` (mirroring the contacts components).
- **Cap gate (Decision 12):** when `atNotesCapacity`, the **"Add note" button is
  disabled** with the shared cap message shown as inline text; editing and
  deleting stay enabled.
- i18n: add the [UI copy](#ui-copy-i18n) strings to
  [`en.json`](../../../../src/frontend/src/lib/i18n/en.json), then
  `npm run i18n:types`.
- Update [`docs/ai/PRODUCT.md`](../../../../docs/ai/PRODUCT.md) in **this** PR to
  describe the personal-notes behaviour (a private list of free-text notes,
  view/add/edit/delete from the user menu, with clickable links in the read-only
  view; **end-to-end encrypted via vetKeys** so the canister and node providers never
  see cleartext; 2,000-char cap; 1,000-note cap).

Tests: modal renders empty/list/view/editing states; tapping a row opens the view;
add and delete call the service and update the store; cap gate disables "Add note";
navigation (new-note Save/Cancel → list; existing-note Save/Cancel → its view);
**the view linkifies only `http`/`https` URLs (as `target="_blank"` anchors) and a
`javascript:`/`data:` URL is rendered inert, not as a link**; **a note with
HTML/script-like content and bidi-override characters renders inertly (no execution,
no UI reordering)**; a multi-byte/emoji note is accepted and counted by code points.

### Quality gates (every PR)

```bash
# Frontend (PR-2, PR-3)
npm run format && npm run lint -- --max-warnings 0 && npm run check && npm run test
# Backend (PR-1)
./scripts/format.sh && ./scripts/lint.rust.sh && ./scripts/lint.did.sh && ./scripts/test.backend.sh
```

---

## Delivery plan (atomic PRs / waves)

| Wave | PR                                                         | Layer    | Depends on |
| ---- | ---------------------------------------------------------- | -------- | ---------- |
| 1    | **PR-1** — backend encrypted storage (EncryptedMaps) + API | backend  | —          |
| 2    | **PR-2** — frontend vetKeys crypto + service + store       | frontend | PR-1 (did) |
| 3    | **PR-3** — Notes menu item + modal (CRUD)                  | frontend | PR-2       |

- This spec doc lands first (or alongside PR-1).
- PR-2 needs the regenerated `backend.did` from PR-1.
- PR-3 is the user-visible feature and updates `PRODUCT.md`.

---

## Out of Scope

1. Attaching a note to a transaction, address, token, or network, **and** showing
   transaction-linked notes in this list — both are permanently out of scope here;
   any future transaction-notes feature lives on its own surfaces (see
   [Relationship to PR #13128](#relationship-to-pr-13128)).
2. A **separate title field**, rich text, attachments, tags, or folders. (The list
   preview shows the note's **first line as a de-facto title**, but the note is still
   a single free-text body — there is no distinct stored title.)
3. **Server-side search / filtering** (impossible anyway — the backend holds only
   ciphertext). **Client-side** search over the loaded, decrypted notes **is in v1**
   (the "Search note" field — see [Design → List](#design)); only server-side search
   is out of scope.
4. **Sharing notes** between users (`EncryptedMaps` supports it; we use a per-user
   key and do not expose sharing) and exporting notes.
5. **Manual reordering / pinning** (sort is fixed newest-first, Decision 7).
6. **Encrypting the existing contacts store** (a separate, larger migration; this
   feature is the first encrypted store but does not retrofit others).

---

## Acceptance Criteria

- [ ] A new **"Notes"** item appears in the user menu
      ([`Menu.svelte`](../../../../src/frontend/src/lib/components/core/Menu.svelte))
      **immediately after the Contacts / Address-book item**, visible only when
      signed in, and opens the Notes modal.
- [ ] Backend exposes `set_personal_note` / `delete_personal_note` (`#[update]`,
      registered-user guard), `get_personal_notes` / `get_personal_notes_count`
      (`#[query]`, not-anonymous guard), and the vetKey-derivation endpoint(s);
      `backend.did` regenerated via `npm run generate` (not hand-edited).
- [ ] The write endpoints are per-caller rate-limited via the existing
      `RateLimiter` and return `RateLimited` when exceeded; reads are not limited.
- [ ] Notes are stored **encrypted** via vetKeys `EncryptedMaps`, owned by the
      caller principal and keyed by an opaque `note_id`; the canister and node
      providers only ever see **ciphertext**, and one user cannot read or write
      another user's notes.
- [ ] A **per-user** symmetric key is derived via vetKD and cached as a
      non-extractable `CryptoKey` in IndexedDB (fetched once per device);
      encryption/decryption happen only in the browser.
- [ ] **Empty / whitespace-only notes cannot be saved** (Save disabled, no backend
      write) in both add and edit; content is trimmed before measuring and storing.
- [ ] The **list/empty state** shows an **(X)** and closes the modal via X, "Close",
      or backdrop click; the **view step** also has the (X)/backdrop close. The
      **add/edit step has no (X)** and **ignores backdrop clicks** — only Cancel or
      Save exits it, so unsaved text can't be lost to an accidental dismissal.
- [ ] **Tapping a list row opens a read-only view** of the full note in a **bordered
      box** (min ~4 rows; first line bold, line breaks preserved). In the view,
      **`http`/`https` URLs are clickable links that open a new tab**
      (`rel="noopener noreferrer"`); other schemes (`javascript:`, `data:`, …) are
      **not** linkified; links are built without `{@html}` of raw input. **A long note
      scrolls inside the box** while the created/updated line and Edit/Delete stay
      pinned. The view's footer is the **primary** button always reading **"Back"**;
      **Edit** is secondary, **Delete** is present.
- [ ] The desktop modal **sizes to content** with a **minimum ~560px** and a **max of
      ~75vh**, both `min(…, 100%)`-clamped to the window; past the max the list /
      editor / view-box scrolls internally with header + footer pinned; the list
      toolbar scrolls with the rows. Mobile is full-page. Spacing/padding reuses the
      existing modal tokens (no new values).
- [ ] **Navigation:** a **new** note returns to the **list** on both Save and Cancel;
      **editing an existing** note returns to that note's **view** on both Save and
      Cancel; **Delete** returns to the list. The list's **"Add note" is the primary
      (filled) action**.
- [ ] The editor **auto-focuses the textarea on open** (add: empty caret; edit: caret
      at end). On **mobile** the editor is a **full-page step** (not a bottom sheet);
      the textarea stays visible above the soft keyboard and **Cancel/Save remain
      reachable while the keyboard is open** (verified on iOS Safari and Android
      Chrome).
- [ ] In **edit** mode, **Save stays disabled until the content changes** from what
      it was when the editor opened (a no-op edit issues no write and does not bump
      `updated_at_ns`).
- [ ] A note longer than 2,000 cleartext characters is blocked client-side with a
      clear error; the backend independently rejects ciphertext above the max byte
      bound (`NoteCiphertextTooLarge`).
- [ ] At the per-user cap (`MAX_PERSONAL_NOTES_PER_USER = 1,000`) the backend
      rejects a **new** note (`TooManyNotes`) and **no existing note is evicted**;
      editing an existing note still succeeds.
- [ ] At the cap, the frontend **disables "Add note"** with a clear explanation;
      editing and deleting remain enabled. The gate is driven by
      `get_personal_notes_count` and stays correct after add/delete.
- [ ] The modal lists notes **newest-first** by `updated_at_ns`; add, edit, and
      delete update the store. **Delete requires a confirmation step** (no undo) — the
      same pattern as deleting a contact: a "Delete note" prompt naming the note
      (first ~15 characters, bold) with "This action cannot be undone.", a desktop
      dialog and a **mobile bottom sheet**, and Cancel / Delete note buttons.
      Confirming deletes; cancelling leaves the note untouched.
- [ ] The list has a **"Search note"** field that filters the loaded, decrypted notes
      **client-side** (case-insensitive substring over the full note text, **no
      backend call**); the trailing icon is a magnifier when empty and a **clear ✕**
      when it has content; a no-match query shows "No notes match your search."
- [ ] A single note that fails to decrypt shows an error + Retry in its row without
      affecting other notes.
- [ ] Notes (and the per-user vetKey) load **lazily on first open** of the Notes
      modal — **not** on wallet init — with a loading state; re-opening the modal in
      the same session renders from the cached store without re-fetching or
      re-deriving the key.
- [ ] A never-edited note shows **"Created …"** in the list row; an edited note
      shows **"Updated …"**. The edit view always shows the created date. All times
      are stored as **UTC** epoch-ns and **displayed in the user's local timezone**,
      using month-day for the current year and month-day-year otherwise.
- [ ] The list row shows a **two-line preview**: line 1 is the note's **first line as
      a bold title** (one line, ellipsis); line 2 is the **remaining lines collapsed
      to single spaces**, lighter (one line, ellipsis), omitted for single-line notes.
      The full note (edit field / full view) preserves its line breaks. **No per-row
      icon.**
- [ ] A note accepts **any language / script / emoji** (arbitrary Unicode, stored as
      UTF-8); the 2,000-char limit is enforced by **Unicode code point** count, not
      UTF-16 length.
- [ ] Note text is **always rendered as plain text** (auto-escaped, never `{@html}`
      of raw input, line breaks via CSS) everywhere it appears, with bidi/control
      characters neutralized — verified by a test that a note containing
      HTML/script-like content (e.g. `<img src=x onerror=...>`) and bidi-override
      characters renders inertly and does not execute or reorder UI. The **only**
      enrichment is safe `http`/`https` URL auto-linking in the read-only view
      (Decision 16).
- [ ] `docs/ai/PRODUCT.md` describes the feature (landed in PR-3).
- [ ] All quality gates pass for each PR.

---

## Open questions (facts to confirm)

1. **`ic-vetkeys` / `EncryptedMaps` API contract** (settled approach — encrypt via
   vetKeys; these are integration facts to confirm during PR-1/PR-2):
   - The exact `EncryptedMaps` Rust API — instantiation, how many `MemoryId`s it
     needs, the owner/map-key/value signatures, and whether it ships
     ready-to-expose endpoints or expects us to wrap its calls.
   - The `@dfinity/vetkeys` frontend API for transport-key generation, vetKey
     decryption, and symmetric-key derivation, plus the IndexedDB
     `CryptoKey`-caching pattern (mirror DFINITY's encrypted-notes sample).
   - The **vetKD key name / configuration** on mainnet vs in pocket-ic tests, and
     how to provision a test key in the integration harness.
   - **Key rotation / loss:** confirm the recovery story if a device cache is
     cleared (key is re-derivable from vetKD, so notes remain decryptable) and that
     no scenario silently orphans ciphertext.
2. **`note_id` scheme.** UUIDv4 (opaque, leaks nothing) vs. ULID (sortable by
   creation, enabling a backend range scan). Newest-first sort is by encrypted
   `updated_at_ns` so the client sorts regardless; UUIDv4 is the simpler default
   unless a future need for server-side ordering favours ULID.
3. **`get` at scale.** Returning all entries is fine for typical note counts; near
   the 1,000 cap (up to ~10 KB ciphertext each) a single fetch + decrypt is bounded
   but non-trivial. Decide whether v1 needs pagination or a "load more", or whether
   the cap + lazy modal load is sufficient (the lower 1,000 cap makes fetch-all more
   comfortable than the original 10,000 design).
4. **Server-attested timestamps.** Timestamps currently live inside the encrypted
   envelope (client-set). If a trusted `created_at`/`updated_at` is wanted, decide
   whether the canister should stamp an unencrypted sidecar value (a small metadata
   leak) instead.
5. **Mobile full-page editor + soft keyboard.** The mobile editor is a **full-page
   step** (decided — not a bottom sheet; a focused text field in a bottom sheet would
   be a new, fragile pattern for a web app, and Apple's HIG favors near-full-height
   presentation for keyboard text entry). Confirm the **Cancel/Save placement** that
   keeps them reachable while the keyboard is open — header actions vs. a
   scroll-to-reach footer — and **verify on iOS Safari and Android Chrome** that the
   textarea stays visible and the actions are reachable. Check how Contacts' "Add new
   contact" full-page step already handles this and follow it.
6. **Existing GitHub issue / design.** Check `dfinity/oisy-wallet` issues for any
   prior discussion of a notes feature before building.

## Pending decisions (facts clear — owner must decide)

_None remaining._

---

## Post-Merge

- `PRODUCT.md` is updated in PR-3 (the behaviour-completing change), not post-merge.
- This spec ships with an asset folder
  `2026-06-17-feat-personal-notes/wireframes/` (the Notes-modal HTML mock). Remove
  that folder post-merge — the shipped app and `PRODUCT.md` become the source of
  truth.
