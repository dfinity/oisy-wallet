# Brand & copy

The OISY voice, vocabulary, colour usage, and icon conventions that
agents are most likely to get wrong. Read this before writing any
user-visible string, picking a colour, or adding an icon.

> Higher up: [`AGENTS.md`](../../../AGENTS.md) →
> [Frontend README](./README.md). Related:
> [`i18n-and-a11y.md`](./i18n-and-a11y.md) (mechanics of i18n keys and
> a11y baseline).

## Voice in one screen

OISY is a browser-native wallet for digital wealth. It targets people
fluent in Apple Pay, Revolut, brokerage apps, not crypto-natives. The
brand should feel like serious financial infrastructure: refined,
private, available everywhere.

Five attributes:

- **Calm and premium.** A private-banking app with browser speed, not
  a whitepaper.
- **Confident and focused.** Say fewer things; make each one land.
- **Human before technical.** Start with what the user feels, then
  explain why it is possible.
- **Empowering.** The user feels capable, in control.
- **Trustworthy.** Quiet confidence, never fear-mongering.

**House sentence:** _Say what is true, in plain words, and stop._ If a
sentence could appear in any company's marketing, cut it.

## Use this, not that

| Prefer                                  | Instead of               | Why                                                            |
| --------------------------------------- | ------------------------ | -------------------------------------------------------------- |
| Secured by advanced cryptography        | Secured by blockchain    | Blockchains have been hacked; cryptography is the actual moat  |
| Sign in the way you unlock your phone   | Seed phrase onboarding   | Lead with the positive experience                              |
| Works from any browser, on any device   | Extension-free wallet    | Describe the gain, not the absence                             |
| Network custody                         | Custodial / self-custody | OISY is a third way; naming it precisely is the message        |
| Passkey login through Internet Identity | Passwordless login       | Product benefit first, proof layer underneath                  |
| OISY (in body copy)                     | OISY Wallet (in body)    | The full lockup is for the logo only                           |
| Digital wealth                          | Crypto only              | OISY covers crypto, stablecoins, tokenized stocks, commodities |

Approved security patterns (stay one layer above implementation; keep
`threshold ECDSA`, EdDSA, Schnorr for technical docs):

- "Secured by advanced cryptography."
- "Runs on the Internet Computer, a tamperproof, always-on, sovereign
  frontier cloud."
- "Your keys are split across independent nodes, with complete-key
  control distributed across the network."
- "Sign in the way you unlock your phone, with your face or fingerprint."

## Banned in any user-visible string

- **Em dashes** (`—`, U+2014). Use commas, periods, colons, parens.
- **`secured by blockchain`.** Use `secured by advanced cryptography`.
- **`OISY token`, `$OISY`.** There is no token; repeating the rumour
  amplifies a scam.
- **OISY-owned Telegram references.** OISY has no Telegram channel,
  community, or support handle. Don't write copy that implies one
  ("Join us on Telegram", "Telegram support", a Telegram link in the
  footer). Third-party dApp connectors that legitimately open Telegram
  (e.g. `open_telegram: "Open $dAppName on Telegram"`) are fine.
- **Degen / hype**: `alpha`, `ape / aping in`, `WAGMI / NGMI / LFG`,
  `gm / ser / fren`, `DYOR / NFA`, `the future is here`,
  `revolutionizing / game-changing`, `next-gen / paradigm shift`.
- **Casino / gambling metaphors.**

## Failure copy

Failure is the most exposed surface of a wallet. The stance is calm and
specific. Every error string follows the same shape:

1. **Name what failed.** Plain language, no error codes, no protocol
   names.
2. **State what was preserved.** Funds, keys, signatures: say so.
3. **Offer one next step.** Try again, refresh the quote, add funds,
   check the address.

Stay one layer above implementation. Hold the temperature: no
exclamation marks, no "immediately", no "Oops".

Patterns:

- **Failed transaction.** "Your transfer didn't complete. The funds
  stayed in your wallet. Try again or check the network status."
- **Network timeout.** "OISY couldn't reach the Ethereum network. Your
  funds and keys are safe. Try again in a moment."
- **Expired session.** "You've been signed out for safety. Sign in with
  your passkey to pick up where you left off."
- **Insufficient funds.** "Not enough Bitcoin to cover this send and
  the network fee. Add funds or lower the amount."
- **Rejected approval.** "You declined the request. Nothing was signed
  and nothing was sent."

Banned in error copy: generic apologies (`Oops! Something went wrong.`),
anxious register (`Sorry, we failed…`), blame-shifting (`You entered the
wrong address.`), raw technical leakage (error codes, call sites,
protocol names), empty reassurance with no next step (`We've notified
our team…`).

## Chain listing

**Canonical order:** Bitcoin, Ethereum, Internet Computer, then the
remaining supported networks in alphabetical order. Currently:
Arbitrum, Base, BNB Smart Chain, Polygon, Solana.

**Short form:** _Bitcoin, Ethereum, Internet Computer, and more._
**Internet Computer is never dropped.**

Use the official network names as defined in
`src/frontend/src/env/networks/`. The L2 / sidechain in particular is
**BNB Smart Chain** (not "BNB Chain"). Tickers (`BTC`, `ETH`, `ICP`,
`SOL`) belong in product UI and tables.

## Colour rules

The frontend already has a complete token system in
[`base-colors.scss`](../../../src/frontend/src/lib/styles/theme/base-colors.scss),
themed in
[`default-theme.scss`](../../../src/frontend/src/lib/styles/theme/default-theme.scss)
and
[`dark-theme.scss`](../../../src/frontend/src/lib/styles/theme/dark-theme.scss).
**Use the `--color-foreground-*` / `--color-background-*` /
`--color-border-*` tokens. Never hard-code hex.**

### Brand rules to follow now

1. **Logo blue is reserved.** `--color-*-brand-primary` (the
   `$oisy-blue-600` SCSS variable) is for the OISY mark and, at most,
   one expressive serif word per surface. Do **not** paint whole
   interfaces in logo blue. Use navy, charcoal, and neutrals for the
   rest.
2. **Fills vs. text.** Background tokens are for fills; foreground
   tokens are for text. When colour names a state (success, warning,
   error), the _text_ uses `--color-foreground-{success,warning,error}-*`,
   not the background fill colour. This already matches the existing
   token naming.
3. **State never carried by colour alone.** Pair every state colour
   with a glyph and a text label. The a11y rule lives in
   [`i18n-and-a11y.md`](./i18n-and-a11y.md#color--contrast).
4. **Accents are sparing.** The bright product gradient and sky accent
   are for wallet UI moments (balance card) and marketing highlights,
   not every surface.
5. **No new top-level colour tokens.** If you need a colour the system
   doesn't have, surface it in the PR description and ask. Don't invent
   a hex.

## Iconography

The repo's icon set lives in
[`$lib/components/icons/`](../../../src/frontend/src/lib/components/icons)
(~80 custom SVG Svelte components). Reach for an existing one before
adding a new icon. When you do add one:

- **Line-first**, rounded joins. Stroke inherits text colour via
  `stroke: currentColor` so the icon recolours with the surrounding
  text. Use a semantic colour only when the icon encodes state.
- **No emoji** in product or marketing copy. No PNG icons. No icon
  fonts.
- Every icon answers a "what does this do" question. Decorative icons
  get `aria-hidden="true"` (see
  [`i18n-and-a11y.md`](./i18n-and-a11y.md#icons)).

The codebase has mixed historical sizes and stroke widths. Aspirational
defaults for _new_ additions: 24px square in product, 1.5px stroke
weight. If you deviate, match the immediate neighbours rather than
inventing a third size.

## Pre-ship copy checklist (every UI change)

- [ ] No em dashes (`—`) in any visible string.
- [ ] Internet Computer appears in every chain list, in the canonical
      order.
- [ ] No reference to a Telegram channel.
- [ ] No claim or implication of an OISY token.
- [ ] Security copy uses "advanced cryptography", never "blockchain".
- [ ] Failure copy names what failed, states what was preserved, offers
      one next step.
- [ ] Lead sentences are positively framed.
- [ ] No degen, casino, or hype language.
- [ ] Logo blue is on the mark and at most one expressive word, not
      the whole UI.
- [ ] State is communicated with colour **and** text **and** a glyph.
- [ ] No hard-coded hex; existing token classes / CSS variables only.
