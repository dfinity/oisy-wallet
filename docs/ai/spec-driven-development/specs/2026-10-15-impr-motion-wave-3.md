# Spec: Motion that is quick, consistent and respects reduced motion

## Goal

Things in OISY appear quickly, leave faster than they came, and never move for someone who
has asked their system for less motion.

Waves 1 and 2 of "make OISY feel better" gave every control a press, a hover that does not
stick on touch, and a pressed state one step past its hover (Wave 2 spec: #14308). They left motion alone. Today most things that appear or disappear do
it at a speed nobody chose, overlays take longer to leave than to arrive, and almost nothing
honours the system's reduced-motion setting.

This improvement sets one set of timings for the whole app, applies it everywhere through one
shared module, and makes the reduced-motion setting work app-wide. It also picks up the
controls Wave 2 set aside: pills, tabs and the toggle.

Source: user request, following Wave 2. Grounded in `main` at `da6932073`.

---

## Background

### What Waves 1 and 2 settled (prerequisite)

- **Presses** go through the `press` mixin and the `press`, `press-icon`, `row-feedback`
  utilities (`lib/styles/mixins/_button.scss`, `lib/styles/global.scss`). They already skip
  reduced motion: nothing shrinks, colours still change.
- **Colour changes** on the shared buttons and full-width rows take 150 ms ease-out.
- **Icon swaps** have a primitive, `ui/IconSwap.svelte` (Wave 1, the copy check): both icons
  stay mounted and cross-fade with a scale and blur, over 300 ms. It already drops the scale
  and blur under reduced motion. `ui/Copy.svelte` and `notes/ShareNoteContent.svelte` use it.

### Where motion stands today

Component paths are under `src/frontend/src/lib/components/`, other paths under
`src/frontend/src/`.

| What                                                  | Today                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Svelte transitions                                    | 188 uses in 125 files (`in:fade` 92, `transition:slide` 48, `transition:fade` 12, `in:slide` 11, `out:fade` 7, `in:blur` 6, `in:fly` 3, and a few others). **123 of them pass no duration**, so they run at Svelte's default of 400 ms.                                                    |
| Shared timings                                        | Only `lib/constants/transition.constants.ts`: `SLIDE_DURATION` / `SLIDE_PARAMS` (250 ms, quintOut, used by about 25 height slides) and `BACKDROP_FADE_OUT_DURATION` (250 ms). Every other duration is a local number.                                                                      |
| Reduced motion                                        | Honoured in 6 places: the press mixin, `ui/PillButton.svelte` (its border arc), `swap/SwapSwitchTokensButton.svelte`, `ui/IconSwap.svelte` and two Halloween illustrations. No Svelte transition checks it.                                                                                |
| Toast (`ui/Toast.svelte:74-75`)                       | Flies in over 200 ms from 100 px; fades out after a 100 ms delay over the default 400 ms, so it takes 500 ms to leave.                                                                                                                                                                     |
| Modal (`ui/Modal.svelte:42-43,68-74`)                 | Panel fades in over 125 ms and out over 200 ms.                                                                                                                                                                                                                                            |
| Backdrop (`ui/Backdrop.svelte:24,37-38`)              | In 75 ms, out 250 ms (`BACKDROP_FADE_OUT_DURATION`), which callers await before navigating.                                                                                                                                                                                                |
| Popover (`ui/Popover.svelte:166,176`)                 | The wrapper fades over the default 400 ms both ways; the panel scales from nothing (Svelte's default `start: 0`) over 150 ms.                                                                                                                                                              |
| Bottom sheet (`ui/BottomSheetContainer.svelte:22,72`) | Slides 300 ms both ways. Its `box-shadow: var(--bottom-sheet-box-shadow)` points at a variable **defined nowhere**, so the sheet has no shadow.                                                                                                                                            |
| Icon state changes                                    | Hard cuts: the progress steps' spinner to check or cross (`ui/ProgressSteps.svelte:18-29`), the privacy eye in the menu (`core/Menu.svelte`, around line 238), the theme switch's sun and moon (`ui/ThemeSwitchButton.svelte:24-28`), NFT hide's eye (`nfts/NftHideButton.svelte:88-116`). |
| CSS animations                                        | `animate-pulse` on 25 loading placeholders and pulsing buttons; the progress `Spinner` (`app-spinner-rotate`, 800 ms); illustration keyframes (astronaut eyes, dome, windows); the Compute pill arc. Only the pill arc and the Halloween ones stop under reduced motion.                   |
| Pills (`ui/PillButton.svelte`)                        | Colour hover, no press.                                                                                                                                                                                                                                                                    |
| Tabs (`ui/Tabs.svelte:56-70`)                         | Colour hover, no pressed state, no moving indicator.                                                                                                                                                                                                                                       |
| Toggle (`ui/Toggle.svelte:44-104`)                    | `transition: all ease-in-out 0.3s`; its `&:hover` rules are not limited to devices that can hover, so they stick on touch.                                                                                                                                                                 |

### Constraints the code imposes

- **`transition:` runs one function both ways.** For a `transition:` directive Svelte calls the
  function with `direction: 'both'`, so it cannot tell the entrance from the exit up front.
  A transition function may instead return a function of `{ direction }`, which Svelte calls
  with the real `'in'` or `'out'` on each run (`svelte/src/internal/client/dom/elements/transitions.js:351`
  in Svelte 5.56). The shared module uses that, so exits get their own timing without changing
  call sites.
- **The backdrop's fade-out is awaited** before some navigations (closing a popover, then
  going to a page). Making it faster makes those navigations start sooner; nothing must rely
  on it being 250 ms.
- **Height slides move layout.** `slide` animates the element's height, so everything below
  it moves too. Under reduced motion that is movement and must not animate.
- **The mobile group sheet** (`navigation/NavigationGroupSheet.svelte`) already sets its own
  timings (fade 150 ms, fly 200 ms, an instant close when switching sheets) and must keep the
  instant close.

---

## Behaviour

### Shared rules

1. **Entrances** take at most 200 ms, ease-out: fast at the start, settling at the end. The
   bottom sheet, which travels the height of the screen, takes 250 ms.
2. **Exits** take at most 150 ms, ease-in, and are never slower than the matching entrance,
   with two exceptions:
   - large surfaces that travel the height of the screen (the bottom sheet, the mobile group
     sheet) take 200 ms to leave;
   - the backdrop arrives in 75 ms, so the dimming is in place as the panel lands, and leaves
     on the shared 150 ms.
3. **Icon swaps** cross-fade over 300 ms, `cubic-bezier(0.2, 0, 0, 1)`, as the copy check
   already does (the make-interfaces-feel-better timing for icon swaps). **Other small state
   changes** (a chip changing) take 150 ms.
4. **Height changes** (a section expanding, an error line appearing under a field) keep their
   current 250 ms both ways; rules 1 and 2 do not apply to them.
5. **Nothing grows from nothing.** Popovers and menus start at 96 % of their size, not at
   zero.
6. **Reduced motion.** With the system's reduced-motion setting on:
   - nothing moves, slides or scales; content that would fly, slide or scale in appears with
     a 100 ms fade instead, and one that already changes faster (an instant close) stays as
     it is;
   - height changes happen at once;
   - pulsing loading placeholders hold still, and decorative illustration animations stop;
   - progress spinners keep turning;
   - colours still change, as they do today.
7. **One timing per kind of motion**, the same everywhere: two fades in the app never run at
   different speeds by accident.

### 1. Shared motion rules

Lands first; on its own it changes nothing visible except under reduced motion, where the
pulsing placeholders and decorative illustrations stop.

### 2. Every transition takes the shared timings

Everything that fades, slides, flies or scales in and out uses the shared timings. Most fades
go from 400 ms to 200 ms in and 150 ms out. Height slides stay at 250 ms. Under reduced
motion they follow rule 6.

### 3. Overlays leave faster than they arrive

- **Toast:** slides in from its edge over 200 ms and leaves over 150 ms with a short slide
  back, with no delay before it starts leaving.
- **Modal:** the panel arrives as today (125 ms) and leaves in 125 ms, no longer slower than
  it came.
- **Backdrop:** arrives in 75 ms as today, leaves in 150 ms.
- **Popover:** fades in over 150 ms and out over 100 ms; the panel grows from 96 % to full
  size.
- **Bottom sheet:** slides up over 250 ms, down over 200 ms.

### 4. The bottom sheet has a shadow

The mobile bottom sheet casts the shadow its styles always asked for, in light and dark.

### 5. Icon state changes cross-fade

The progress steps' spinner turning into a check or a cross, the menu's privacy eye, the theme
switch's sun and moon, and NFT hide's eye cross-fade like the copy check does, instead of
cutting, over the copy check's 300 ms. Under reduced motion every icon swap, the copy check
included, is a 100 ms fade.

### 6. Pills, tabs and the toggle

- **Pills** shrink slightly while pressed, like text buttons.
- **Tabs** show their label one step darker while pressed, without shrinking.
- **The toggle** animates only what changes (its knob position and colours) over 150 ms, and
  its hover shows only on devices that can hover. Under reduced motion the knob jumps to its
  new side; the colours still change over 150 ms.

### Negative guarantees (what it does _not_ do)

- It does **not** change any layout, size, colour or radius at rest.
- It does **not** slow anything down: no motion gets longer than it is today.
- It does **not** remove the press shrink, hover colours or focus rings from Waves 1 and 2.
- It does **not** stop progress spinners under reduced motion.
- It does **not** stagger entrances: content still appears as one piece, so flows like send
  and swap feel no slower. A stagger can be tried later on screens outside those flows.
- It does **not** touch the carousel (its own treatment), add a moving indicator to the tabs,
  or change shadows and borders on cards (design calls, not scheduled). Surfaces and
  typography (logo outlines, steady numbers, corners) are Wave 4.

---

## Implementation

One PR per area, in order. Area 1 lands first; areas 2 to 6 depend only on it.

### 1. Shared motion rules

- `lib/constants/transition.constants.ts`: named timings next to the existing slide ones:
  enter 200 ms ease-out (`cubicOut`), exit 150 ms ease-in (`cubicIn`), 150 ms for small state changes other than icon swaps, the
  reduced-motion fade 100 ms. `SLIDE_*` stay at 250 ms. `BACKDROP_FADE_OUT_DURATION` is left
  for area 3, since changing it is visible.
- A shared transitions module, `lib/utils/transitions.utils.ts`, exporting `fade`, `fly`,
  `slide`, `scale` and `blur` with the same signatures as `svelte/transition`. Each fills in
  the shared timing when the caller passes none (returning a function of `{ direction }`, so a
  `transition:` exit gets the exit timing), keeps any timing the caller passes, and under
  reduced motion (`prefersReducedMotion` from `svelte/motion`) turns `fly`, `scale` and
  `blur` into a 100 ms fade, caps `fade` at 100 ms and makes `slide` an instant change. A
  shorter duration the call site passes is kept, so the group sheet's `duration: 0` close
  (`navigation/NavigationGroupSheet.svelte:50`) stays instant. `scale` defaults to
  `start: 0.96`.
- `lib/styles/global.scss`: under `prefers-reduced-motion: reduce`, `animate-pulse` and
  `animate-ping` stop (`animation: none`), and a `decorative-motion` utility stops every
  animation inside the element that carries it. The decorative illustrations take it
  (`icons/animated/AnimatedScanIcon`, `AnimatedIconAiAssistant`, `AnimatedIconUfo`,
  `signer/SignerIdleAnimatedAstronaut`); the `Spinner` and `AnimatedIconLoader` show progress
  and keep turning.
- Docs: `docs/ai/frontend/stack-and-patterns.md` gets a "Motion" section (the timings, the
  module, reduced motion, when a call site may pass its own timing, `decorative-motion`);
  `docs/ai/frontend/reusability.md` lists the module and the utility.
- No lint rule yet: until area 2 swaps the imports, 125 files still import
  `svelte/transition`.

### 2. Every transition takes the shared timings

- Swap `from 'svelte/transition'` to `from '$lib/utils/transitions.utils'` in the 125 files.
  Call sites that pass no timing pick up the shared one; call sites that pass one
  (`SLIDE_PARAMS` and `SLIDE_DURATION` on height slides, the group sheet, `WizardTransition`)
  keep it.
- Three call sites pass a timing over the limits and move onto the shared one:
  - `ui/Busy.svelte:35`: `out:fade` 200 ms → the shared exit;
  - `routes/(sign)/sign/+page.svelte:45`: `in:fade` 250 ms → the shared entrance, keeping its
    150 ms delay, which stops the idle state flashing while the relying party connects;
  - `rewards/RewardEarnings.svelte:139`: `transition:fade={SLIDE_DURATION}` borrows the 250 ms
    height timing for a fade → no params, so it takes the shared entrance and exit.
- The overlays' own timings change in area 3. `SLIDE_*` stay on height slides only.
- One PR: every change is the same import line, so the diff is reviewed by search rather
  than by reading.
- The module re-exports the parameter types (`FadeParams`, `FlyParams`, `SlideParams`,
  `ScaleParams`, `BlurParams`, `TransitionConfig`, `EasingFunction`), so a file that imports a
  type with a function (`routes/(sign)/sign/+page.svelte:4`) takes both from the module.
- `eslint.config.mjs`: `no-restricted-imports` refuses `svelte/transition` outside the shared
  module and `lib/constants/transition.constants.ts` (which holds the timings the module is
  built on), with a message pointing to the module.

### 3. Overlays leave faster than they arrive

- `ui/Toast.svelte:74-75`: `in:fly` 200 ms from a short distance (16 px, not 100 px); `out:fly`
  150 ms ease-in back the same way, no delay.
- `ui/Modal.svelte:42-43,68-74`: `FADE_OUT_DURATION` 125 ms.
- `ui/Backdrop.svelte` and `BACKDROP_FADE_OUT_DURATION`: out via the shared exit timing
  (150 ms). Check every awaiter of `BACKDROP_FADE_OUT_DURATION` still behaves.
- `ui/Popover.svelte:166,176`: wrapper `in:fade` 150 ms / `out:fade` 100 ms; panel `scale` from
  0.96 over 150 ms ease-out.
- `ui/BottomSheetContainer.svelte:22`: `in:` 250 ms ease-out, `out:` 200 ms ease-in.

### 4. The bottom sheet has a shadow

- Define `--bottom-sheet-box-shadow` in the theme (light and dark), from the existing shadow
  tokens if one fits; `ui/BottomSheetContainer.svelte:72` already uses it.

### 5. Icon state changes cross-fade

- Wrap the four swaps in `IconSwap`: `ui/ProgressSteps.svelte:18-29` (spinner → check or
  cross; select the terminal icon before revealing the result layer),
  `core/Menu.svelte` privacy eye, `ui/ThemeSwitchButton.svelte:24-28`,
  `nfts/NftHideButton.svelte:88-116`. Keep the NFT action mounted while its state changes;
  reuse its confirmation wrapper for both states but open it only when hiding a collection
  with multiple NFTs. Upcoming progress steps keep their numbered circle; active steps use
  one swap from the spinner to the selected check or cross, so failure never exposes a success icon. `Button` keeps its children mounted through
  loading so the NFT icon swap survives the pending action; the existing spinner and pulse stay.
  The NFT button retains its previous displayed icon during loading and starts the swap when
  its children are revealed, even if the token store updates before the NFT reload finishes.
- `IconSwap` keeps its 300 ms, `cubic-bezier(0.2, 0, 0, 1)`, scale 0.25 and 4 px blur, the
  values make-interfaces-feel-better gives icon swaps, so the four new swaps match the copy
  check. It is a CSS transition, not a Svelte one, so its reduced-motion block (which
  already drops the scale and blur) also shortens the opacity fade to the reduced-motion
  100 ms.

### 6. Pills, tabs and the toggle

- `ui/PillButton.svelte`: `press` (0.98), `transition-[color,background-color,border-color,scale]`.
- `ui/Tabs.svelte:56-70`: `active:` label colour one step past hover, 150 ms; no scale.
- `ui/Toggle.svelte:44-130`: the track's and the knob's `transition: all ease-in-out 0.3s`
  become explicit properties at 150 ms ease-out: the track's `background-color`, and the
  knob's `transform` (it moves with `translateX`) and `background`. The wrapper's static
  `scale` (1.45) is not animated. Under `prefers-reduced-motion: reduce` the knob's
  `transform` is left out of its transition, so it moves at once. `&:hover` rules go through
  `interaction.hover`.

### `PRODUCT.md`

Add a **"Motion"** subsection to "Interaction feedback": the timings in plain words, overlays
leaving faster than they arrive, and what reduced motion does. Each area PR adds its line.

### Tests

jsdom does not run transitions or CSS animations; tests assert the inputs that produce them.

- `transitions.utils.spec.ts`: each wrapper fills in the shared timing when none is passed,
  keeps a passed one, returns the reduced-motion form when `prefersReducedMotion.current` is
  true, and `scale` defaults to 0.96.
- Area 2, the lint rule: checked by probe both ways, as the `oisy-trade` boundary was (the repo
  has no harness for lint-rule tests): a file importing `svelte/transition` outside the module
  fails, the module and `transition.constants.ts` pass.
- Area 3: the overlays pass the expected params (spy on the module's functions).
- Area 5: each component renders `IconSwap` with the right `swapped` state.
- Area 6: `PillButton` has `press`; `Tabs` has the pressed colour class.
- Visual checks in the mock UI (`npm run dev:mock`) for every area, with reduced motion
  emulated as well.

---

## Acceptance criteria

1. No Svelte transition runs at the 400 ms default: every one uses a shared timing or an
   explicit one its call site chose.
2. Entrances take at most 200 ms (the bottom sheet 250 ms); exits take at most 150 ms (the
   bottom sheet and the group sheet 200 ms). No exit is longer than its entrance, except the
   backdrop's (75 ms in, 150 ms out). Height changes take 250 ms both ways.
3. Popovers grow from 96 %, not from zero.
4. With reduced motion on: nothing flies, slides or scales; fades take at most 100 ms, and an
   instant close stays instant; height changes are instant; pulsing placeholders and illustrations hold still; the spinner turns; colours
   still change.
5. The toast leaves over 150 ms with no delay.
6. The mobile bottom sheet shows a shadow in light and dark.
7. The four icon state changes cross-fade over 300 ms, like the copy check.
8. Pills press like text buttons; tabs show a pressed label; the toggle animates in 150 ms and
   its hover does not stick on touch.
9. Importing `svelte/transition` outside the shared module fails lint.
10. `PRODUCT.md` has a "Motion" subsection covering every area shipped.
11. `npm run format`, `npm run lint -- --max-warnings 0`, `npm run check`, `npm run test`
    pass on every PR.

---

## Open questions (facts to confirm)

1. **Who awaits the backdrop.** List every awaiter of `BACKDROP_FADE_OUT_DURATION` and confirm
   none depends on 250 ms (for example a test with fake timers, or a navigation that must
   not start before the backdrop is gone).
2. ~~**Tests that wait on 400 ms.**~~ Settled while building area 2: none. The full suite
   passes with every transition on the shared timings.
3. ~~**The `a0_mo` … `a4c_mo` keyframes.**~~ Settled while building: they animate
   `icons/animated/AnimatedScanIcon` (the Scan QR icon), which is decorative and stops under
   reduced motion. `AnimatedIconLoader` turns to show progress and keeps running.
4. **A shadow token for the bottom sheet.** Check whether the theme already has a raised-
   surface shadow to reuse, or whether area 4 needs a new token.

## Pending decisions (facts are clear, a call is needed)

1. ~~**Spinners under reduced motion.**~~ Decided: they keep turning, since a spinner is often
   the only sign that work is happening (WCAG treats such motion as essential).
2. ~~**`IconSwap` at 300 ms.**~~ Decided: it keeps 300 ms, the timing make-interfaces-feel-better
   gives icon swaps, and the four new swaps in area 5 use it. (First decided as a move to
   150 ms, then reversed against the skill.)
3. ~~**Splitting area 2.**~~ Decided: one PR across the 125 files, with the lint rule.
