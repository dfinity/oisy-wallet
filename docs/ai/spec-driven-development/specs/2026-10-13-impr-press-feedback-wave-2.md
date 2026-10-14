# Spec: Rows, cards, navigation and small controls answer a press

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Everything in OISY that can be pressed shows that it was pressed, at the moment it is
pressed, and every small control is easy to hit.

Wave 1 of "make OISY feel better" gave the shared `Button` and `ButtonIcon` a press, stopped
hover colours sticking after a tap on phones, and confirmed copies in place (#14294, #14295,
#14296, #14297, #14298, #14303). Most of what people tap every day is not built on those two
components: token rows, activity rows, the navigation, NFT cards, the swap flip button, close
and info buttons. They give no feedback on press today, several keep their hover colour after
a tap, and many are 16 to 28 px targets.

This improvement brings them to the Wave 1 standard, one area per PR.

Source: user request, following the Wave 1 PRs above.

---

## Background

### What Wave 1 settled (prerequisite)

Wave 2 builds on two Wave 1 PRs, both merged:

- **#14294.** Styled `Button`s press to `scale: 0.98`, `ButtonIcon`s to `0.96`, through the
  `press` mixin in `src/frontend/src/lib/styles/mixins/_button.scss`. No scale when disabled,
  loading or under `prefers-reduced-motion`. The `static` prop opts out (class `no-press`,
  because `static` is a Tailwind utility). Text buttons got the smaller press after 0.96 felt
  too strong on full-width buttons: the same scale takes far more pixels off a wide element.
  It also registers a passive no-op `touchstart` listener on the document in
  `src/frontend/src/routes/+layout.svelte`: iOS Safari applies `:active` on a tap only when
  the page has a touch listener, so every pressed state in this spec depends on it.
- **#14295.** SCSS hover rules go through `interaction.hover`
  (`src/frontend/src/lib/styles/mixins/_interaction.scss`), which applies them only under
  `@media (hover: hover)`, as Tailwind's `hover:` already does.

### Where feedback is missing today

Paths are under `src/frontend/src/lib/`.

| Area                   | Today                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token rows             | `ui/LogoButton.svelte:54-65` paints its hover on an outer `<div>`, not on the button; 29 uses. Token rows in `tokens/TokensList.svelte:172,236` and `tokens/TokenGroupCard.svelte:106,122` hover with wrapper `div`s. No row has a pressed state. When a group is expanded, its header's hover colour equals its background, so hover disappears.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Activity and list rows | All hand-rolled, all hover with a 10 % blue fill (`hover:bg-brand-subtle-10`, 15 uses), none has a pressed state: `transactions/Transaction.svelte:152`, `tip/TipHistory.svelte:202`, `notes/NoteListItem.svelte:63`, `contact/AddressListItem.svelte:35`, `trading/OisyTradeOrderRow.svelte:182`, `trading/OisyTradePositionRow.svelte:103`, `transactions/filter/TransactionsFilterMobileSheet.svelte:127`. `common/ListItemButton.svelte` is a full-width `Button`, so it already scales to 0.98.                                                                                                                                                                                                                                                                                                                                                                                  |
| Navigation             | `.nav-item` (`styles/global/links.scss:21-44`): hover and pressed look the same, colours fade over 700 ms, hover is not guarded, so it sticks on touch. On the mobile bar (`navigation/NavigationMenuMainItems.svelte:406-448`) the `div.mobile-nav` override suppresses every press colour. The group sheet cards (338-366) have no feedback at all.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Cards                  | dApp cards (`dapps/DappCard.svelte:19`) and reward cards (`rewards/RewardCard.svelte:43`) have no hover or press. `nfts/NftCard.svelte:72-110`, `nfts/NftCollectionCard.svelte:71-127`: `transition-all`, a hover lift (`hover:-translate-y-1`), no press. Their `dark:` classes follow the OS theme, not OISY's, because Tailwind's `dark` variant is not tied to the `theme` attribute on `<html>`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Amount forms           | `swap/SwapSwitchTokensButton.svelte:15-28`: nothing rotates when the tokens swap. `common/MaxBalanceButton.svelte:103-109`: a 22 px raw button with no hover or press and `transition-all`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Small controls         | About 13 close, info and clear buttons are 16 to 28 px: toast close 22 px (`ui/Toast.svelte:107`), modal close 26 px (`ui/Modal.svelte:92`), popover close 34 px (`ui/Popover.svelte:179`), info toggles 24 px (`settings/SettingsCardItem.svelte:28`, `settings/SettingsExportData.svelte:112`, `rewards/RewardsRequirements.svelte:62`), 20 px (`earning/EarningPotentialCard.svelte:30`, `BorrowingPowerCard.svelte:25`), 16 px (`trading/limit-order/LimitOrderForm.svelte:196`), and the closes in `info/InfoBox.svelte:22`, `core/Banner.svelte:21,29`, `core/PwaBanner.svelte:27`, `agreements/AgreementsBanner.svelte:47`, `ui/InputSearch.svelte:34`, `btc/components/transactions/BtcTransactionsHeader.svelte:22`. There is no shared hit-area helper. In `contact/AddressItemActions.svelte` the action icons already overlap each other by 4 to 8 px on mobile (`-m-1`). |

### Constraints the code imposes

- **Layers.** All global SCSS sits in `@layer base` (`styles/global.scss:20-65`), so any
  Tailwind utility on an element beats it. A `transition-colors`, `transition` or
  `transition-all` utility replaces the whole transition list, including `scale`, so a press
  on such an element snaps instead of easing.
- **`display: contents`.** `Transaction` and `TipHistory` wrap their row in a
  `<button class="contents">`; a background on the button paints nothing, so the pressed fill
  goes on the inner span.
- **Controls inside rows.** `:active` applies to every ancestor of the pressed element, so
  pressing the copy icon in a contact row, a toggle in a token row or the dismiss button on an
  active transaction also makes the row `:active`. `:has()` is already used in the global
  styles (`styles/global/body.scss:12`), so a row can exclude that case.
- **Positioning.** A `scale` makes the element the containing block of its absolutely
  positioned children. The Finance circle on the mobile bar
  (`NavigationMenuMainItems.svelte:436-437`) is positioned against the fixed bar, so scaling
  its button would move it. NFT and reward card badges sit inside their own `relative` image
  boxes and are unaffected.
- **Grey means open.** On the mobile bar, the grey fill on More and Finance means "this sheet
  is open over another page" (`docs/ai/PRODUCT.md`, Navigation). A press must not reuse it.

---

## Behaviour

### Shared rules

1. **Full-width rows** show a **pressed fill one step darker than their hover**: 20 % OISY
   blue (`bg-brand-subtle-20`) over a 10 % hover. They do **not** scale.
2. **Whole-card buttons** press to **0.98**, like text buttons.
3. **Icon-size controls** press to **0.96**, like `ButtonIcon`.
4. **Hover** appears only on devices that can hover.
5. **Timing.** Colour and scale change over 150 ms ease-out, and releasing mid-press eases
   back.
6. **Reduced motion.** Nothing scales; colours still change.
7. **Disabled** elements show nothing.
8. **A row is not pressed while a control inside it is pressed.** The control shows its own
   press; the row stays as it is.
9. **Tap areas.** Every small control can be hit across at least 40 × 40 px, while its visible
   size stays the same. Tap areas of neighbours never overlap: where two controls sit closer
   than that, each area stops halfway into the gap between them.

### 1. Token list rows

Token rows on Assets, the rows inside a token group, the group header, and every other
`LogoButton` list with a click (earning positions, swap providers, networks, recent
destinations, contacts in send, the token and NFT settings menus) show the pressed fill.
The header of an expanded group opens and closes the whole card, so hovering it outlines the
whole card, sub-tokens included: a blue fill on the white card would be the colour of the page
behind it. `ListItemButton` stops scaling and uses the pressed fill like the other rows.

### 2. Activity and list rows

Transaction rows, tip history rows, note rows, contact address rows, OISY Trade order and
position rows, and the transaction filter rows on mobile show the pressed fill. Contact rows
keep their own copy, info, edit and delete buttons pressable without the row lighting up.

### 3. Navigation

- **Desktop sidebar and menus** (`.nav-item`, `ButtonMenu`): hover 10 %, pressed 20 %,
  selected unchanged. Colour changes take 150 ms instead of 700 ms. Hover appears only on
  devices that can hover.
- **Mobile bottom bar**: pressing an entry shrinks its **icon and label** to 0.96, not the
  button, so the Finance circle stays where it is. Finance shrinks its circle. **No colour
  change**: grey keeps meaning "sheet open" and blue keeps meaning "current page".
- **Group sheet cards** (Trade, Earn, Borrow, NFTs, Explore, ...) press to 0.98.

### 4. Cards

NFT and collection cards press to 0.98 and keep their hover lift. The lift and the press use
separate properties and both animate over 150 ms instead of `transition-all` over 300 ms.
The badges that use `dark:` follow OISY's theme setting, not the OS.

dApp cards (Explore) and reward cards press to 0.98, with no new hover.

### 5. Amount forms

- **Swap flip button**: the arrow turns 180° each time the tokens swap, over 300 ms, and
  turns back the other way on the next swap. The button presses to 0.96.
- **Max**: presses to 0.96, gets a hover, and a 40 × 40 tap area within the gap it has.

### 6. Small controls and tap areas

Every control listed under "Small controls" above presses to 0.96 and gets a 40 × 40 tap
area. Where neighbours are closer (the contact row actions, the modal close next to header
actions, the token details copy and edit, which are 4 px apart), each area stops halfway into
the gap. The contact row actions lose their negative margins, so they stop overlapping.

### Negative guarantees (what it does _not_ do)

- It does **not** change any size, colour, radius, border or layout at rest.
- It does **not** scale full-width rows.
- It does **not** colour the mobile bar on press, so grey and blue keep their meanings.
- It does **not** show a hover on touch screens.
- It does **not** scale anything under reduced motion.
- It does **not** light up a row when a control inside it is pressed.
- It does **not** enlarge any visible control, and no two tap areas overlap.
- It does **not** touch segmented controls, tabs, `Toggle` or `Checkbox` (see Pending
  decisions), overlay and toast motion, focus-ring colours, or borders and shadows. Those
  belong to later waves.

---

## Implementation

Six PRs, one per area. #14294 and #14295 are on `main`. Each updates `docs/ai/PRODUCT.md`
(see below) and the tests for what it touches.

### Shared pieces (land with the first PR that needs them)

In `src/frontend/src/lib/styles/global.scss`, next to the existing `@custom-variant h-md`:

- **`pressed:` variant**:
  `&:active:not(:has(:is(a, button, input, label, [role='button']):active))`, so a press on a
  nested control does not paint the row (rule 8).
- **`child-pressed:` variant**, for a wrapper whose direct child is the button (`LogoButton`):
  two `:has()` side by side, `&:has(> :is(a, button):active):not(:has(> :is(a, button) :is(...):active))`.
  Not named `has-*` (Tailwind's own compound `has-*` variant takes it over) and not one
  `:has()` inside another (invalid CSS, so the browser drops the rule).
- **`press` / `press-icon` utilities**: 0.98 / 0.96 while held, built on the `press` mixin the
  shared buttons use (`lib/styles/mixins/_button.scss`), so one rule serves both.
- **`row-feedback` utility**: 10 % hover (guarded by `(hover: hover)`), 20 % with `pressed:`,
  background over 150 ms.
- **`hit-area` utility**: a centred `::after` of `max(100%, var(--hit-area, 2.5rem))` each
  way, capped per axis with `[--hit-area-x:...]` / `[--hit-area-y:...]`. It does not set
  `position`; the control adds `relative` unless it is already positioned.

Touched elements replace `transition-colors`, `transition` and `transition-all` with explicit
lists (`transition-[background-color,color,scale]` and so on), `duration-150 ease-out`.

Document them in `docs/ai/frontend/stack-and-patterns.md` ("Press feedback": which element
gets which utility, and the pitfalls), `docs/ai/frontend/reusability.md`, the pre-flight
checklist in `docs/ai/frontend/README.md`, and the jsdom notes in `docs/ai/frontend/testing.md`.

### 1. Token list rows

- `ui/LogoButton.svelte`: the wrapper `div` gets `child-pressed:bg-brand-subtle-20` when the
  row has an `onClick`; `hover` stays where it is. That covers token rows, group rows and the
  other `LogoButton` lists.
- `tokens/TokenGroupCard.svelte`: when the group is expanded, hovering the header outlines the
  whole card with an inset 1 px `--color-border-brand-subtle-30` ring under `(hover: hover)`
  (inset because the list clips each card).
- `common/ListItemButton.svelte`: pass `static` and use `row-feedback`.

### 2. Activity and list rows

- `Transaction.svelte:152` and `TipHistory.svelte:202`: `row-feedback` on the inner span, which
  is itself the ancestor of whatever is tapped, so it works whether the button renders as
  `contents` or `block`.
- `NoteListItem`, `AddressListItem`, `OisyTradeOrderRow`, `OisyTradePositionRow` and
  `TransactionsFilterMobileSheet`: `row-feedback`.
- `contact/AddressItemActions.svelte`: Edit and Delete stop propagation like Info already
  does, so pressing them never opens the row.

### 3. Navigation

- `styles/global/links.scss`: `.nav-item` `:hover` goes through `interaction.hover`;
  `:active` becomes `bg-brand-subtle-20` and no longer equals hover or selected;
  `transition-colors duration-700` becomes 150 ms. The `div.mobile-nav` override keeps a
  transparent background in every state.
- `navigation/NavigationItem.svelte`, `NavigationMenuMainItems.svelte`: on the mobile bar,
  wrap icon and label in an element that takes `group-active:scale-[0.96]` (the button is
  the `group`); Finance applies it to its circle span. The absolutely positioned "new" tag
  sits outside that element or keeps its static position.
- Sheet cards (`navCard`, 338-366): `active:scale-[0.98]`, `motion-reduce:active:scale-100`,
  explicit transition.

### 4. Cards

- Add `@custom-variant dark (&:where([theme=dark], [theme=dark] *));` to
  `styles/global.scss`, so `dark:` follows `theme` on `<html>`
  (`src/frontend/src/lib/utils/theme.utils.ts`). The PR also checks the other two `dark:`
  users (`address-book/ContactHeader.svelte:35` and the second NFT card).
- `NftCard`, `NftCollectionCard`: `transition-all duration-300` becomes
  `transition-[translate,scale,background-color] duration-150 ease-out`; add
  `active:scale-[0.98] motion-reduce:active:scale-100`.
- `dapps/DappCard.svelte:19` and `rewards/RewardCard.svelte:43`: the same press with an
  explicit transition. Both keep their absolutely positioned logo and badge inside `relative`
  boxes, so the scale does not move them.

### 5. Amount forms

- `SwapSwitchTokensButton.svelte`: a `rotated` state flips on each swap and rotates the icon
  with `rotate-180` and `transition-[rotate] duration-300` (`motion-reduce:transition-none`).
  The button is icon-size, so it presses to 0.96 rather than the 0.98 it gets as a `Button`
  today.
- `MaxBalanceButton.svelte` and the near-copy in `convert/ConvertAmountSource.svelte:160-174`:
  explicit transition, `hover:` colour, `active:scale-[0.96]`, `hit-area` capped at the
  9 px it has above.

### 6. Small controls and tap areas

For each control listed: `hit-area` (capped where a neighbour is closer than 40 px), an
`active:scale-[0.96]` press with an explicit transition, and an `aria-label` where one is
missing (the three settings and rewards info toggles, the two earning cards' info buttons).
`AddressItemActions` drops `-m-1`. `ButtonControl` is left alone: only the carousel uses it.

### `PRODUCT.md`

Add an **"Interaction feedback"** section after "Navigation". The first Wave 2 PR to merge
opens it with the shared rules above, including the Wave 1 ones it builds on (press scales,
hover only on devices that can hover, copy confirmed on the button). Every later PR adds its
area's lines, including the negative guarantees that apply to it.

### Tests

jsdom does not apply `:active`, so tests assert on the classes and props that produce the
behaviour (as `ButtonSignInInternetIdentity.spec.ts` does), and visual QA happens on staging.

- Extend the existing specs for each touched component; the area tables above name them.
- Add specs where none exist and the change is logic, not only classes:
  `SwapSwitchTokensButton` (the rotation flips on each swap) and `AddressItemActions` (Edit
  and Delete do not open the row).
- `NftCard.spec.ts:99-121` asserts on `hover:bg-primary` and `group`; keep those assertions
  true.

---

## Acceptance criteria

1. Every listed row shows a 20 % blue fill while pressed, does not scale, and shows nothing
   extra when a control inside it is pressed.
2. Hovering an expanded token group's header outlines the whole card, sub-tokens included.
3. Desktop navigation items: hover 10 %, pressed 20 %, 150 ms, no hover left after a tap on
   touch.
4. Mobile bar: pressing an entry shrinks its icon and label to 0.96. The Finance circle does
   not move. No colour change on press. Grey still appears only when a sheet is open over
   another page.
5. Sheet cards, NFT cards, dApp cards and reward cards press to 0.98. NFT cards keep their
   lift.
6. The NFT badges that use `dark:` follow OISY's theme setting when it differs from the OS.
7. The swap arrow turns 180° on each swap and back on the next. Reduced motion skips the
   turn animation.
8. Every listed small control can be hit across 40 × 40 px (or up to half the gap to its
   neighbour), looks unchanged at rest, and presses to 0.96. No two tap areas overlap.
9. The contact row actions no longer overlap on mobile, and Edit and Delete never open the
   row.
10. Nothing scales under reduced motion; nothing shows on disabled controls.
11. `docs/ai/PRODUCT.md` has an "Interaction feedback" section covering every area shipped.
12. `npm run format`, `npm run lint -- --max-warnings 0`, `npm run check`, `npm run test`
    pass on every PR.

---

## Open questions (facts to confirm)

1. **Swap flip button size.** Its `Button` computes to 48 × 48 px inside a 36 px wrapper
   (`SwapSwitchTokensButton.svelte:15-28`). Confirm the rendered size on staging before PR 5;
   it decides how much tap area the button already has.
2. ~~**`IcTransaction` row.**~~ Settled while building: the fill sits on the inner span,
   which is pressed whichever display the button ends up with.
3. **Nested controls in `LogoButton`.** Its `action` snippet renders toggles inside the
   `<button>` (`TokensMenu`, `TokenCard` with `onToggle`). Confirm in Safari that pressing a
   toggle does not paint the row before PR 1.

## Pending decisions (facts are clear, a call is needed)

1. **Segmented controls, tabs, `Toggle`, `Checkbox`.** `ui/Tabs.svelte`,
   `tip/TipExpiry.svelte`, `nfts/NftGroupToggle.svelte`,
   `trading/limit-order/LimitOrderSideControl.svelte` change colour only; `ui/Toggle.svelte`
   already scales its wrapper (1.45 / 1.6 / 1.8), which a press scale would replace, not
   multiply. Decide their press treatment for a later wave.
2. **Hover on dApp and reward cards.** This wave gives them a press only. Decide whether they
   also get a hover.
3. **Buttons inside buttons.** `LogoButton` renders action controls inside its `<button>`,
   and `AddressListItem` nests `AddressItemActions` in one. That is invalid HTML. Decide
   whether to restructure them, separately from this wave.
4. **Focus-ring colours.** `focus-visible:outline-brand-primary` and `-primary-alt` generate
   no CSS (found in #14303), so the ring falls back to the text colour. Decide whether to add
   the colours to the outline palette.
5. **`MaxBalanceButton` in error.** Its static `text-brand-primary-alt` competes with
   `text-error-primary` when the amount is invalid. Decide which wins.
6. **Carousel.** Taken out of this wave: it needs its own treatment. What is known: the dots
   in `carousel/Indicator.svelte:27-28` are 6 px tall and 4 px apart, use `transition-all`,
   and a stray `}` in their class string leaves the last dot with a margin; the two
   `ButtonControl`s in `carousel/Controls.svelte:16-19` are 28 px and 4 px apart; the close
   button in `dapps/DappsCarouselSlide.svelte:108` sits in two `overflow: hidden` layers
   (`Carousel.svelte:288,293`), which would clip any tap area.
