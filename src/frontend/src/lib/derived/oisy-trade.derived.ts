import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { enabledIcTokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import type { OisyTradeAsset } from '$lib/types/oisy-trade';
import {
	oisyTradeDepositableTokens as mapDepositableTokens,
	mapOisyTradeAssets,
	oisyTradeSupportedTokenSymbols as mapSupportedTokenSymbols,
	sumOisyTradeAssetsUsd
} from '$lib/utils/oisy-trade.utils';
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

// The supported trade tokens resolved to their matching app `IcToken` (by ledger
// canister id), keyed by symbol. The trade canister exposes only symbol/decimals,
// so the form joins against the enabled IC tokens (which include testnets when a
// testnet network is on) to recover the logo, name, network and standard the
// shared `TokenInput` needs. The limit-order token picker performs the same
// per-ledger resolution; surfacing it here lets the form thread the real token.
export const oisyTradeIcTokenBySymbol: Readable<Record<string, IcToken>> = derived(
	[oisyTradeSupportedTokens, enabledIcTokens],
	([$supportedTokens, $enabledIcTokens]) => {
		const byLedger = $enabledIcTokens.reduce<Record<string, IcToken>>((acc, token) => {
			acc[token.ledgerCanisterId] = token;
			return acc;
		}, {});

		return $supportedTokens.reduce<Record<string, IcToken>>((acc, tradeToken) => {
			const { symbol } = tradeToken.metadata;
			if (symbol in acc) {
				return acc;
			}
			const token = byLedger[tradeToken.id.ledger_id.toText()];
			if (nonNullish(token)) {
				acc[symbol] = token;
			}
			return acc;
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
