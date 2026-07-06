import type {
	Token,
	TradingPairInfo,
	UserOrder,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { enabledIcTokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import type {
	OisyTradeAsset,
	OisyTradeOrderView,
	OisyTradeWithdrawToken
} from '$lib/types/oisy-trade';
import {
	isOisyTradeOrderActive,
	oisyTradeDepositableTokens as mapDepositableTokens,
	mapOisyTradeAssets,
	mapOisyTradeOrders,
	oisyTradeSupportedTokenSymbols as mapSupportedTokenSymbols,
	sumOisyTradeAssetsFreeUsd,
	sumOisyTradeAssetsUsd,
	toOisyTradeWithdrawTokens
} from '$lib/utils/oisy-trade.utils';
import { calculateTokenUsdBalance } from '$lib/utils/token.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const oisyTradePairs: Readable<TradingPairInfo[]> = derived(
	oisyTradeStore,
	({ pairs }) => pairs ?? []
);

export const oisyTradeSupportedTokens: Readable<Token[]> = derived(
	oisyTradeStore,
	({ supportedTokens }) => supportedTokens ?? []
);

export const oisyTradeBalances: Readable<UserTokenBalance[]> = derived(
	oisyTradeStore,
	({ balances }) => balances ?? []
);

// True once the first load has resolved (balances populated). Distinguishes the
// initial loading state from a genuinely empty wallet, so the Trading tab can show
// skeletons first instead of flashing the onboarding placeholder.
export const oisyTradeLoaded: Readable<boolean> = derived(oisyTradeStore, ({ balances }) =>
	nonNullish(balances)
);

const oisyTradeRawOrders: Readable<UserOrder[]> = derived(
	oisyTradeStore,
	({ orders }) => orders ?? []
);

// The caller's orders resolved to OISY tokens, newest first. Orders whose
// base/quote ledger the wallet doesn't know are dropped.
export const oisyTradeOrders: Readable<OisyTradeOrderView[]> = derived(
	[oisyTradeRawOrders, enabledIcTokens],
	([$orders, $enabledIcTokens]) => mapOisyTradeOrders({ orders: $orders, tokens: $enabledIcTokens })
);

// Working orders (Active tab): status Pending or Open.
export const oisyTradeActiveOrders: Readable<OisyTradeOrderView[]> = derived(
	oisyTradeOrders,
	($orders) => $orders.filter(isOisyTradeOrderActive)
);

// Terminal orders (History tab): status Filled, Canceled or Expired.
export const oisyTradeHistoryOrders: Readable<OisyTradeOrderView[]> = derived(
	oisyTradeOrders,
	($orders) => $orders.filter((order) => !isOisyTradeOrderActive(order))
);

// The distinct union of base + quote token symbols across all trading pairs —
// the set of tokens OISY TRADE supports (onboarding chips, empty states).
export const oisyTradeSupportedTokenSymbols: Readable<string[]> = derived(
	oisyTradePairs,
	($pairs) => mapSupportedTokenSymbols($pairs)
);

// DEX balances resolved to OISY tokens, enriched with totals and fiat values.
export const oisyTradeAssets: Readable<OisyTradeAsset[]> = derived(
	[oisyTradeBalances, enabledIcTokens, exchanges],
	([$balances, $enabledIcTokens, $exchanges]) =>
		mapOisyTradeAssets({
			balances: $balances,
			tokens: $enabledIcTokens,
			exchanges: $exchanges
		})
);

// Total fiat value of all DEX-deposited balances (free + reserved), added to
// the hero net-worth total.
export const oisyTradeUsdValue: Readable<number> = derived(oisyTradeAssets, ($assets) =>
	sumOisyTradeAssetsUsd($assets)
);

// Fiat value of the free (withdrawable / tradeable) portion of DEX deposits —
// the "$X free" part of the provider page's Deposited box.
export const oisyTradeFreeUsdValue: Readable<number> = derived(oisyTradeAssets, ($assets) =>
	sumOisyTradeAssetsFreeUsd($assets)
);

// Fiat value locked in open orders (total deposited minus free) — the
// "$Y in orders" part of the Deposited box.
export const oisyTradeReservedUsdValue: Readable<number> = derived(
	[oisyTradeUsdValue, oisyTradeFreeUsdValue],
	([$total, $free]) => $total - $free
);

// Whether the user has any DEX deposit yet — drives the onboarding-vs-sections
// state on the Trading tab.
export const oisyTradeHasAssets: Readable<boolean> = derived(
	oisyTradeAssets,
	($assets) => $assets.length > 0
);

// The OISY tokens the user can deposit: DEX-supported tokens (matched by ledger
// canister id) that the user holds. Resolved against `enabledIcTokens` — the
// user's enabled IC tokens including testnets — so a testnet DEX (e.g. staging,
// which trades TESTICP / ckSepolia*) surfaces the right tokens, not just mainnet.
// Tokens whose balance can't cover the ledger fee still appear (Max clamps to 0).
export const oisyTradeDepositableTokens: Readable<IcToken[]> = derived(
	[oisyTradeSupportedTokens, enabledIcTokens, balancesStore],
	([$supportedTokens, $enabledIcTokens, $balances]) =>
		mapDepositableTokens({
			supportedTokens: $supportedTokens,
			tokens: $enabledIcTokens,
			hasBalance: (token) => ($balances?.[token.id]?.data ?? ZERO) > ZERO
		})
);

// Fiat value the user could still deposit: the wallet balances of the
// depositable tokens (held in the wallet, not yet on the DEX) — the provider
// page's "Trading potential".
export const oisyTradeDepositableUsdValue: Readable<number> = derived(
	[oisyTradeDepositableTokens, balancesStore, exchanges],
	([$tokens, $balances, $exchanges]) =>
		$tokens.reduce(
			(acc, token) => acc + (calculateTokenUsdBalance({ token, $balances, $exchanges }) ?? 0),
			0
		)
);

// DEX balances joined with the matching OISY token, so the Trading tab can offer
// a Withdraw entry per holding with the token pre-resolved.
export const oisyTradeWithdrawTokens: Readable<OisyTradeWithdrawToken[]> = derived(
	[oisyTradeBalances, enabledIcTokens],
	([$oisyTradeBalances, $enabledIcTokens]) =>
		toOisyTradeWithdrawTokens({ balances: $oisyTradeBalances, icrcTokens: $enabledIcTokens })
);

// The supported trade tokens resolved to their matching app `IcToken` (by ledger
// canister id), keyed by symbol. The trade canister exposes only symbol/decimals,
// so the form joins against `enabledIcTokens` (the user's enabled IC tokens,
// including testnets and the built-in ICP tokens) to recover the logo, name,
// network and standard the shared `TokenInput` needs — so a testnet DEX resolves
// its tokens too. Same resolution inlined in `LimitOrderTokensList`.
export const oisyTradeIcTokenBySymbol: Readable<Record<string, IcToken>> = derived(
	[oisyTradeSupportedTokens, enabledIcTokens],
	([$supportedTokens, $enabledIcTokens]) => {
		const byLedger = $enabledIcTokens.reduce<Record<string, IcToken>>(
			(acc, token) => ({ ...acc, [token.ledgerCanisterId]: token }),
			{}
		);

		return $supportedTokens.reduce<Record<string, IcToken>>((acc, tradeToken) => {
			const { symbol } = tradeToken.metadata;
			if (symbol in acc) {
				return acc;
			}
			const token = byLedger[tradeToken.id.ledger_id.toText()];
			return nonNullish(token) ? { ...acc, [symbol]: token } : acc;
		}, {});
	}
);

// Free DEX balance per token symbol, in human units (smallest units scaled by
// the token's own decimals). Keyed by symbol so the limit-order form can look
// up the spend/receive balances for the chosen base/quote.
export const oisyTradeFreeBalanceBySymbol: Readable<Record<string, number>> = derived(
	oisyTradeBalances,
	($balances) =>
		$balances.reduce<Record<string, number>>((acc, { token, balance }) => {
			acc[token.metadata.symbol] = Number(balance.free) / 10 ** token.metadata.decimals;
			return acc;
		}, {})
);
