# OISY Wallet

A browser-native wallet that holds, sends and swaps tokens across ICP, Bitcoin, EVM chains, Solana and XRP.

## Swap

**Offer**:
One provider's quote for a swap pair and amount: what the user would receive, and on what terms.
_Avoid_: Quote (in UI copy), route, rate

**Smart Swap**:
OISY's comparison of offers from every enabled provider, which picks one for the user by default.
_Avoid_: Aggregator, best-rate routing

**Protected offer**:
An offer whose minimum receive amount is guaranteed by the provider's protocol or by OISY's check before signing; the swap reverts or refunds instead of filling below it. Exact offers count as protected.
_Avoid_: Fixed slippage, guaranteed offer, safe offer

**Exact offer**:
A protected offer with no price movement to protect against: a 1:1 bridge minus fees, or a fill-or-kill order at the quoted price.
_Avoid_: Zero-slippage offer

**Unprotected offer**:
An offer whose receive amount is only an estimate; the provider fills at whatever price applies when the deposit arrives, with no minimum. Shown to users as "Estimate".
_Avoid_: Indicative quote, no-slippage offer, risky offer

**Max slippage**:
The user's tolerance for a protected offer filling below its receive amount; it sets that offer's minimum. It has no effect on an unprotected offer.
_Avoid_: Slippage tolerance (in UI copy)
