# Workflow: Add an i18n key

Tiny but easy to get wrong. Follow these steps in order.

## Steps

1. **Find the right bucket** in
   [`src/frontend/src/lib/i18n/en.json`](../../../../src/frontend/src/lib/i18n/en.json).
   Read the surrounding keys before adding — your key should fit the
   existing structure (`<feature>.<sub>.<purpose>.<name>`). Top-level
   buckets include `core`, `auth`, `send`, `receive`, `swap`, `tokens`,
   `networks`, `settings`, `wallet_connect`, `transactions`, `nfts`,
   `rewards`, `ai_assistant`, `convert`, `agreements`, …
2. **Pick the purpose**:
   - `text.*` — labels, headings, body copy.
   - `actions.*` — button / CTA copy.
   - `error.*` — error messages.
   - `placeholder.*` — input placeholders.
   - `alt.*` — `alt` text and `aria-label`s.
   - `info.*` — banners, tooltips, descriptive copy.
     (Add a new purpose only if a clear one doesn't exist.)
3. **Name the key** in `snake_case`. Keep it stable: it should describe
   _meaning_, not the current English wording. `confirm_delete` is good;
   `are_you_sure_you_want_to_delete` is bad.
4. **Add the key + English copy** to `en.json`. Keep the surrounding
   structure (`text` keys grouped, `actions` after `text`, etc.).
5. **Use placeholders** for dynamic content via the `$placeholder` syntax:

   ```json
   "more_items": "+$items more"
   ```

   Substitute via `replacePlaceholders` from `$lib/utils/i18n.utils`. Do
   **not** concatenate sentences with `+`.

6. **Regenerate types and key helpers**:

   ```bash
   npm run i18n
   ```

   This regenerates
   [`src/frontend/src/lib/types/i18n.d.ts`](../../../../src/frontend/src/lib/types/i18n.d.ts)
   and the keys helpers under `src/frontend/src/lib/i18n/`. Commit the
   `en.json` change and the generated files together. **Never edit the
   generated `.d.ts` by hand.**

7. **Use it via property access** (so dead-key tooling can find it):

   ```svelte
   <button>{$i18n.send.actions.confirm}</button>
   ```

   or in a `.ts` module:

   ```ts
   import { i18n } from '$lib/stores/i18n.store';
   import { get } from 'svelte/store';
   const msg = get(i18n).send.error.amount_too_low;
   ```

   **Never** dynamically construct the key path (`$i18n[someVar]`) — it
   defeats type safety.

8. **Don't touch other locales.** Files like `de.json`, `fr.json`,
   `ja.json`, `zh-CN.json`, etc. are **machine-translated** by the
   `auto-update-i18n` workflow from `en.json`. Any manual edit will be
   overwritten on the next run.

9. **Run the gates**:

   ```bash
   npm run format
   npm run lint -- --max-warnings 0
   npm run check
   ```

10. **PR**: usually ships as part of a `feat(frontend)` / `fix(frontend)`
    / `style(frontend)` PR. If it's truly i18n-only, use
    `feat(frontend): add translations for <feature>` (matching e.g.
    `feat(frontend): add translations for the signups_closed feature`).

## Renaming a key

1. Add the new key. Migrate every caller. Remove the old key. Run
   `npm run i18n`. Verify nothing references the old key (`grep -r
   'old_key'`).
2. Single PR titled `refactor(frontend): rename i18n key <old> → <new>`
   (atomic — no other changes).

## Removing a dead key

If a key is no longer referenced — delete it from `en.json`, run
`npm run i18n`, commit. Don't leave keys around "in case".

## Pluralisation

The setup is **string + placeholder**, no ICU. For pluralisation, either:

- Pick the closest existing pattern (e.g. two keys: `one_<thing>` and
  `n_<thing>`) and follow it, or
- Surface the missing capability in the PR description and ask before
  introducing a new dependency.

## Don't

- Hard-code English in a component "just for now".
- Edit the generated `i18n.d.ts` by hand.
- Edit any locale file other than `en.json`.
- Construct keys dynamically.
- Leave old keys around "in case".
