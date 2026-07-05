This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.
Implementers must also follow the analytics conventions in
[`docs/ai/frontend/analytics.md`](../../frontend/analytics.md), the canonical
reference for events and their property schema.

# Spec: Personal-notes analytics (Plausible)

## Goal

Give the personal-notes feature clean, structured Plausible tracking, in **two
events** that share one context:

1. **`personal_note`** — the note lifecycle (create / edit / delete / open). New
   tracking; today this is completely uninstrumented.
2. **`note_share`** — the share funnel. Consolidates the **six** existing flat
   `note_share_*` events into one event, differentiated by properties.

Both use `event_context: personal_notes` and follow the house domain-service
pattern (`trackTokenManage` / `trackTrading`; see
[`analytics.md` §5](../../frontend/analytics.md)): the action rides in
`event_modifier`, the outcome in `result_status`, so one event name covers a whole
flow instead of a name-per-step. The two events ship together because they are the
same feature and share enums and an analytics service.

## Motivation

- **CRUD is untracked.** `savePersonalNote` / `deletePersonalNote` in
  [`personal-notes.services.ts`](../../../../src/frontend/src/lib/services/personal-notes.services.ts)
  fire no events, and [`NotesModal.svelte`](../../../../src/frontend/src/lib/components/notes/NotesModal.svelte)
  only tracks the share-dialog open. We have no signal on adoption — first note
  created, edits, deletes, how often the surface is opened.
- **Share tracking is over-fragmented.** Sharing emits six separate event names
  (see below), which clutters the event list, can't be funnelled as one flow, and
  has drifted on naming — `note_share_created` sends `singleUse` (camelCase) while
  `note_share_recipient_revealed` sends `single_use` (snake_case), and neither
  carries `event_context` / `event_subcontext`.

One consistent, property-differentiated pair of events fixes both and matches the
documented pattern.

## Background (today's code)

### Note lifecycle (to instrument)

- Write path:
  [`personal-notes.services.ts`](../../../../src/frontend/src/lib/services/personal-notes.services.ts)
  → `savePersonalNote` (create **and** edit — the caller distinguishes by whether
  the note id already exists) and `deletePersonalNote`.
- Store: [`personal-notes.store.ts`](../../../../src/frontend/src/lib/stores/personal-notes.store.ts)
  — current notes, used to tell create from edit and to detect the user's first note.
- UI: [`NotesModal.svelte`](../../../../src/frontend/src/lib/components/notes/NotesModal.svelte).

### Share funnel (to consolidate) — all six already fire

- `note_share_open` — [`NotesModal.svelte`](../../../../src/frontend/src/lib/components/notes/NotesModal.svelte) (~L252), share dialog opened.
- `note_share_created` — [`ShareNoteContent.svelte`](../../../../src/frontend/src/lib/components/notes/ShareNoteContent.svelte) (~L92), with `{ expiry, singleUse }`.
- `note_share_recipient_view` — [`(public)/notes/share/[token]/+page@.svelte`](<../../../../src/frontend/src/routes/(public)/notes/share/[token]/+page@.svelte>) `onMount`.
- `note_share_recipient_revealed` — same page, on reveal, with `{ single_use }`.
- `note_share_recipient_unavailable` — same page, dead-link end state.
- `note_share_recipient_discover` — [`SharedNoteOutro.svelte`](../../../../src/frontend/src/lib/components/notes/SharedNoteOutro.svelte) / [`SharedNoteUnavailable.svelte`](../../../../src/frontend/src/lib/components/notes/SharedNoteUnavailable.svelte), with `{ source: 'outro' | 'unavailable' }`.

Additionally, on the revealed note in
[`SharedNoteRevealed.svelte`](../../../../src/frontend/src/lib/components/notes/SharedNoteRevealed.svelte)
the **Copy note** button (`onCopy`) and the **Done** button (`onDone`, which clears
the plaintext and advances to the outro) are **not tracked today** — this spec adds
`copy` and `close` steps for them. The "Discover OISY" click after closing is
already covered by the `discover` step above.

### Analytics plumbing (reused, not rebuilt)

Single entry point `trackEvent` in
[`analytics.services.ts`](../../../../src/frontend/src/lib/services/analytics.services.ts)
(non-critical, never throws, no-op when the flag is off); names in the
`PLAUSIBLE_EVENTS` enum + metadata-value enums in
[`enums/plausible.ts`](../../../../src/frontend/src/lib/enums/plausible.ts).

## Design

### Shared enums (in `enums/plausible.ts`)

- `PLAUSIBLE_EVENTS.PERSONAL_NOTE = 'personal_note'`
- `PLAUSIBLE_EVENTS.NOTE_SHARE = 'note_share'`
- `PLAUSIBLE_EVENT_CONTEXTS.PERSONAL_NOTES = 'personal_notes'`
- `PLAUSIBLE_EVENT_SUBCONTEXT_NOTES.SHARE = 'share'` (new subcontext enum for the notes area)
- `PLAUSIBLE_EVENT_SOURCE_LOCATIONS.NOTES = 'notes'`,
  `NOTE_SHARE_DIALOG = 'share_dialog'`,
  `NOTE_SHARE_RECIPIENT_PAGE = 'recipient_page'`

### One analytics service

Add `personal-notes-analytics.services.ts` exporting **two** functions,
`trackPersonalNote` and `trackNoteShare`, both funnelling into `trackEvent`. Only
properties meaningful to a given call are attached (conditional spreads; unused
keys omitted, never `undefined`) — [`analytics.md` §4](../../frontend/analytics.md).

#### Event 1 — `personal_note` (lifecycle)

```ts
export type PersonalNoteStep = 'create' | 'edit' | 'delete' | 'open';

export interface TrackPersonalNoteParams {
	step: PersonalNoteStep; // → event_modifier
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES; // success | error (open → success)
	isFirstNote?: boolean; // create only → event_value: first_note
	error?: string; // sanitised; omitted when empty
}
```

| Interaction          | `event_modifier`                     | `result_status`     | Fires from                              |
| -------------------- | ------------------------------------ | ------------------- | --------------------------------------- |
| Note created         | `create`                             | `success` / `error` | `savePersonalNote` (new-id branch)      |
| First note ever      | `create` + `event_value: first_note` | `success`           | `savePersonalNote`, via store count     |
| Note edited          | `edit`                               | `success` / `error` | `savePersonalNote` (existing-id branch) |
| Note deleted         | `delete`                             | `success` / `error` | `deletePersonalNote`                    |
| Notes surface opened | `open`                               | `success`           | `NotesModal` open                       |

Common props: `event_context: personal_notes`, `event_modifier`, `result_status`,
optional `source_location: notes`, `event_value: first_note` on first create,
`result_error` only on failure.

Fire CRUD events from the **service layer** so every caller is covered (success
after the awaited backend call, error in the catch); fire `open` from `NotesModal`.

#### Event 2 — `note_share` (funnel)

```ts
export type NoteShareStep =
	| 'open' // creator opened the share dialog
	| 'create' // creator generated a link
	| 'view' // recipient opened the link
	| 'reveal' // recipient revealed the note
	| 'copy' // recipient clicked "Copy note" on the revealed note
	| 'close' // recipient clicked "Done" to dismiss the revealed note (→ outro)
	| 'unavailable' // recipient hit a dead/expired/used link
	| 'discover'; // recipient clicked the "Discover OISY" CTA

export interface TrackNoteShareParams {
	step: NoteShareStep; // → event_modifier
	side: 'creator' | 'recipient'; // → source_location
	resultStatus?: PLAUSIBLE_EVENT_RESULT_STATUSES; // create: success/error
	singleUse?: boolean; // create, reveal → single_use
	expiry?: string; // create → expiry label (e.g. '7d')
	sourceDetail?: string; // discover → source_detail: outro|unavailable
	error?: string; // sanitised; create error only
}
```

Common props: `event_context: personal_notes`, `event_subcontext: share`,
`event_modifier` (step), `source_location` (`share_dialog` creator /
`recipient_page` recipient). Old → new mapping:

| Old event                          | `event_modifier` | `source_location` | Extra properties                                                   |
| ---------------------------------- | ---------------- | ----------------- | ------------------------------------------------------------------ |
| `note_share_open`                  | `open`           | `share_dialog`    | —                                                                  |
| `note_share_created`               | `create`         | `share_dialog`    | `single_use`, `expiry`, `result_status` (+`result_error` on error) |
| `note_share_recipient_view`        | `view`           | `recipient_page`  | —                                                                  |
| `note_share_recipient_revealed`    | `reveal`         | `recipient_page`  | `single_use`                                                       |
| _(new — untracked today)_          | `copy`           | `recipient_page`  | —                                                                  |
| _(new — untracked today)_          | `close`          | `recipient_page`  | —                                                                  |
| `note_share_recipient_unavailable` | `unavailable`    | `recipient_page`  | —                                                                  |
| `note_share_recipient_discover`    | `discover`       | `recipient_page`  | `source_detail` (`outro` \| `unavailable`)                         |

Property names normalise to snake_case, fixing the `singleUse` / `single_use` drift.

## Implementation (atomic PRs)

Keep PRs small and atomic (AGENTS.md commandments 2–3).

**PR-1 — analytics service + enums.** Add all enum members, the
`personal-notes-analytics.services.ts` module with `trackPersonalNote` **and**
`trackNoteShare`, and its `.spec.ts` (every step × outcome; create success/error
split; property omission; no note content / token / key). No call sites yet —
pure, testable, zero behaviour change.

**PR-2 — wire the lifecycle.** Call `trackPersonalNote` from `savePersonalNote`
(create vs. edit via id presence; `isFirstNote` via the store) and
`deletePersonalNote` (success + error), and fire `open` in `NotesModal` alongside
the share-open call. Extend `personal-notes.services.spec.ts` / `NotesModal.spec.ts`.

**PR-3 — consolidate share events + add `close`.** Replace the six `trackEvent({
name: TRACK_NOTE_SHARE_* })` calls (`NotesModal`, `ShareNoteContent`, recipient
`+page@.svelte`, `SharedNoteOutro`, `SharedNoteUnavailable`) with
`trackNoteShare(...)`, and delete the six `TRACK_NOTE_SHARE_*` constants from
[`analytics.constants.ts`](../../../../src/frontend/src/lib/constants/analytics.constants.ts).
Additionally fire `trackNoteShare({ step: 'copy', side: 'recipient' })` from
`SharedNoteRevealed`'s `onCopy`, and `trackNoteShare({ step: 'close', side:
'recipient' })` from the recipient page's `onDone` handler (the **Done** button).
Update the affected component specs.

**Quality gates (every PR):** `npm run format`, `npm run lint -- --max-warnings 0`,
`npm run check`, `npm run test`.

**Docs:** [`docs/ai/PRODUCT.md`](../../PRODUCT.md) already has an
`## Analytics` section (with a `### "Learn More" Link Tracking` subsection). Add a
`### Personal notes tracking` subsection there documenting the `personal_note` and
`note_share` events and their property matrices, following the Learn-More pattern,
and cross-reference it from the existing `## Personal notes` / `### Sharing a note`
sections. **Status:** deferred by the product owner (2026-07-05) to a separate
follow-up PR — not landed in the lifecycle / share PRs.

## Out of Scope

1. **Backend / canister-side analytics** for notes.
2. **New UI** — no new components or copy. The two new steps (`copy`, `close`)
   hook the existing **Copy note** / **Done** buttons; otherwise this instruments
   existing behaviour and reshapes the existing share events.
3. **Note content, per-note identifiers, or length histograms** in metadata — see
   the pending decision on bucketed length.
4. **Recipient-page privacy model** — unchanged; recipient events stay anonymous.

## Acceptance Criteria

- **Lifecycle:** creating a note fires `personal_note` `create` / `success`;
  failures fire `error` with a sanitised `result_error` and no note content. First
  successful create additionally carries `event_value: first_note`. Edit → `edit`,
  delete → `delete` (success/error each). Opening the surface → `open` / `success`.
- **Share:** exactly one event name, `note_share`, covers all six former steps
  **plus the new `copy` and `close` steps**, each with the correct `event_modifier`
  - `source_location` and
    `event_context: personal_notes` / `event_subcontext: share`. Creation failures
    emit `error` + sanitised `result_error`. Property names are snake_case; `singleUse`
    no longer appears. The six `TRACK_NOTE_SHARE_*` constants are removed and unused.
- No event, in any path, includes the note text, a note id, a share token, a share
  key, or PII (asserted in tests).
- With `PLAUSIBLE_ENABLED` off, all note flows behave identically and nothing fires.
- All frontend gates pass.

## Analytics privacy (hard invariants)

Per [`analytics.md` §6](../../frontend/analytics.md): properties must never
include note text, a note id, the share token, the share key, ciphertext, or PII.
Recipient-side share steps fire on the logged-out `(public)` page — keep them
anonymous. Errors are sanitised (strip IC request ids) and omitted when empty.
Values are strings; optional fields absent, never `undefined`.

## Migration note (dashboards)

The share consolidation renames live events. Existing Plausible dashboards / goals
referencing `note_share_*` will need updating to the single `note_share` event
filtered by `event_modifier` / `source_location`.

## Decisions (locked)

1. **No bucketed note length.** Create/edit events emit nothing about the note's
   content or size — stay content-free.
2. **Track `open` (notes surface).** `personal_note` fires `event_modifier: open`
   when the notes modal opens.
3. **`note_share` keeps both `open` and `create`.** Dialog-opened and link-created
   are tracked separately, giving the creator conversion rate.
4. **`expiry` is a human label** (`1d` / `7d` / `30d`) — the option label the user
   picked, not a raw ms / ISO duration.

## Open questions (facts to confirm)

1. Does `savePersonalNote` have enough context to tell create from edit without an
   extra store read, or should the caller pass an explicit flag?
2. Is `NotesModal` open the only entry to the notes surface, or are there other
   openers (deep link, empty-state CTA) that should also fire `open`?

## Post-Merge

`PRODUCT.md`'s `## Analytics` section still needs the `### Personal notes tracking`
subsection (see Docs above) and reconciliation with
[`analytics.md`](../../frontend/analytics.md). **Deferred** by the product owner
(2026-07-05) to a separate follow-up PR — it is **not** part of the lifecycle /
share PRs. The new/renamed events are documented in the PR bodies meanwhile.
